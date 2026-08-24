using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using PersonalAssistant.Core.Ai;

namespace PersonalAssistant.Infrastructure.Ai;

public class GeminiAiService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private const string Model = "gemini-3.6-flash";

    public GeminiAiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"]
            ?? throw new InvalidOperationException("Gemini API key nahi mili. User secrets me daalo.");
    }

    private object BuildPayload(AiRequest request)
    {
        var systemText = string.IsNullOrWhiteSpace(request.SystemPrompt)
            ? "You are a helpful personal assistant."
            : request.SystemPrompt;

        var contents = new List<object>();
        foreach (var msg in request.History)
        {
            var geminiRole = msg.Role == "assistant" ? "model" : "user";
            contents.Add(new { role = geminiRole, parts = new object[] { new { text = msg.Content } } });
        }

        // Naya message — image ke saath ya bina
        if (!string.IsNullOrEmpty(request.ImageBase64))
        {
            contents.Add(new
            {
                role = "user",
                parts = new object[]
                {
                    new { text = string.IsNullOrWhiteSpace(request.Message) ? "Is image ke baare me batao." : request.Message },
                    new { inline_data = new { mime_type = request.ImageMimeType ?? "image/jpeg", data = request.ImageBase64 } }
                }
            });
        }
        else
        {
            contents.Add(new
            {
                role = "user",
                parts = new object[] { new { text = request.Message } }
            });
        }

        return new
        {
            system_instruction = new { parts = new[] { new { text = systemText } } },
            contents = contents
        };
    }

    public async Task<AiResponse> GetResponseAsync(AiRequest request, CancellationToken cancellationToken)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:generateContent?key={_apiKey}";
        var httpResponse = await _httpClient.PostAsJsonAsync(url, BuildPayload(request), cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            var error = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            return new AiResponse { Content = $"(Gemini error {(int)httpResponse.StatusCode}) {error}", Model = Model };
        }

        var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var text = doc.RootElement.GetProperty("candidates")[0]
            .GetProperty("content").GetProperty("parts")[0]
            .GetProperty("text").GetString();

        return new AiResponse { Content = text ?? "(khaali jawab)", Model = Model };
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(
        AiRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:streamGenerateContent?alt=sse&key={_apiKey}";

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(BuildPayload(request))
        };

        using var response = await _httpClient.SendAsync(
            httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var friendly = (int)response.StatusCode switch
            {
                429 => "AI is busy right now (limit reached). Please try again shortly.",
                401 or 403 => "There is an issue with the AI key. Please check the configuration.",
                >= 500 => "The AI service is temporarily down. Please try again later.",
                _ => "Could not get a response from the AI. Please try again."
            };
            yield return friendly;
            yield break;
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line)) continue;
            if (!line.StartsWith("data:")) continue;

            var jsonPart = line.Substring("data:".Length).Trim();
            if (jsonPart == "[DONE]") break;

            string? text = null;
            try
            {
                using var doc = JsonDocument.Parse(jsonPart);
                text = doc.RootElement.GetProperty("candidates")[0]
                    .GetProperty("content").GetProperty("parts")[0]
                    .GetProperty("text").GetString();
            }
            catch { }

            if (!string.IsNullOrEmpty(text))
                yield return text;
        }
    }
}
