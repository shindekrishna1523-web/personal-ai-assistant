using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using PersonalAssistant.Core.Ai;

namespace PersonalAssistant.Infrastructure.Ai;

public class GeminiAiService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    private const string Model = "gemini-3.6-flash";

    public GeminiAiService(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;

        _apiKey = configuration["Gemini:ApiKey"]
            ?? throw new InvalidOperationException(
                "Gemini API key nahi mili.");
    }

    private object BuildPayload(AiRequest request)
    {
        var systemText = string.IsNullOrWhiteSpace(request.SystemPrompt)
            ? "You are a helpful personal assistant."
            : request.SystemPrompt;

        var contents = new List<object>();

        foreach (var msg in request.History)
        {
            var role = msg.Role == "assistant"
                ? "model"
                : "user";

            contents.Add(new
            {
                role,
                parts = new object[]
                {
                    new { text = msg.Content }
                }
            });
        }

        if (!string.IsNullOrEmpty(request.ImageBase64))
        {
            contents.Add(new
            {
                role = "user",
                parts = new object[]
                {
                    new
                    {
                        text = string.IsNullOrWhiteSpace(request.Message)
                            ? "Is image ke baare me batao."
                            : request.Message
                    },
                    new
                    {
                        inline_data = new
                        {
                            mime_type = request.ImageMimeType ?? "image/jpeg",
                            data = request.ImageBase64
                        }
                    }
                }
            });
        }
        else
        {
            contents.Add(new
            {
                role = "user",
                parts = new object[]
                {
                    new { text = request.Message }
                }
            });
        }

        return new
        {
            system_instruction = new
            {
                parts = new[]
                {
                    new { text = systemText }
                }
            },

            contents,

            generationConfig = new
            {
                maxOutputTokens = 1024,

                thinkingConfig = new
                {
                    thinkingLevel = "low"
                }
            }
        };
    }

    public async Task<AiResponse> GetResponseAsync(
        AiRequest request,
        CancellationToken cancellationToken)
    {
        var url =
            $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:generateContent";

        using var httpRequest =
            new HttpRequestMessage(HttpMethod.Post, url);

        httpRequest.Headers.Add("x-goog-api-key", _apiKey);

        httpRequest.Content =
            JsonContent.Create(BuildPayload(request));

        using var httpResponse =
            await _httpClient.SendAsync(
                httpRequest,
                cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            var error =
                await httpResponse.Content.ReadAsStringAsync(
                    cancellationToken);

            return new AiResponse
            {
                Content =
                    $"(Gemini error {(int)httpResponse.StatusCode}) {error}",
                Model = Model
            };
        }

        using var stream =
            await httpResponse.Content.ReadAsStreamAsync(
                cancellationToken);

        using var doc =
            await JsonDocument.ParseAsync(
                stream,
                cancellationToken: cancellationToken);

        var textParts = new List<string>();

        if (doc.RootElement.TryGetProperty(
                "candidates",
                out var candidates))
        {
            foreach (var candidate in candidates.EnumerateArray())
            {
                if (!candidate.TryGetProperty(
                        "content",
                        out var content))
                    continue;

                if (!content.TryGetProperty(
                        "parts",
                        out var parts))
                    continue;

                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty(
                            "thought",
                            out var thought) &&
                        thought.ValueKind == JsonValueKind.True)
                    {
                        continue;
                    }

                    if (part.TryGetProperty(
                            "text",
                            out var textElement))
                    {
                        var text = textElement.GetString();

                        if (!string.IsNullOrWhiteSpace(text))
                            textParts.Add(text);
                    }
                }
            }
        }

        return new AiResponse
        {
            Content = textParts.Count > 0
                ? string.Concat(textParts)
                : "(khaali jawab)",

            Model = Model
        };
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(
        AiRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var url =
            $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:streamGenerateContent?alt=sse";

        using var httpRequest =
            new HttpRequestMessage(HttpMethod.Post, url);

        httpRequest.Headers.Add("x-goog-api-key", _apiKey);

        httpRequest.Content =
            JsonContent.Create(BuildPayload(request));

        using var response =
            await _httpClient.SendAsync(
                httpRequest,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var friendly = (int)response.StatusCode switch
            {
                429 =>
                    "AI is busy right now. Please try again shortly.",

                401 or 403 =>
                    "There is an issue with the AI key. Please check the configuration.",

                >= 500 =>
                    "The AI service is temporarily down. Please try again later.",

                _ =>
                    "Could not get a response from the AI. Please try again."
            };

            yield return friendly;
            yield break;
        }

        await using var stream =
            await response.Content.ReadAsStreamAsync(
                cancellationToken);

        using var reader =
            new StreamReader(stream);

        while (!reader.EndOfStream)
        {
            var line =
                await reader.ReadLineAsync(
                    cancellationToken);

            if (string.IsNullOrWhiteSpace(line))
                continue;

            if (!line.StartsWith("data:"))
                continue;

            var jsonPart =
                line["data:".Length..].Trim();

            if (jsonPart == "[DONE]")
                break;

            string? textToYield = null;

            try
            {
                using var doc =
                    JsonDocument.Parse(jsonPart);

                var root = doc.RootElement;

                if (!root.TryGetProperty(
                        "candidates",
                        out var candidates))
                    continue;

                foreach (var candidate in candidates.EnumerateArray())
                {
                    if (!candidate.TryGetProperty(
                            "content",
                            out var content))
                        continue;

                    if (!content.TryGetProperty(
                            "parts",
                            out var parts))
                        continue;

                    foreach (var part in parts.EnumerateArray())
                    {
                        if (part.TryGetProperty(
                                "thought",
                                out var thought) &&
                            thought.ValueKind == JsonValueKind.True)
                        {
                            continue;
                        }

                        if (part.TryGetProperty(
                                "text",
                                out var textElement))
                        {
                            var text = textElement.GetString();

                            if (!string.IsNullOrEmpty(text))
                                textToYield = text;
                        }
                    }
                }
            }
            catch (JsonException)
            {
                // Ignore malformed/incomplete SSE chunks.
            }

            if (!string.IsNullOrEmpty(textToYield))
                yield return textToYield;
        }
    }
}


