namespace PersonalAssistant.Core.Ai;

public interface IAiService
{
    Task<AiResponse> GetResponseAsync(AiRequest request, CancellationToken cancellationToken);

    // Streaming — jawab tukdo (chunks) me deta hai
    IAsyncEnumerable<string> StreamResponseAsync(AiRequest request, CancellationToken cancellationToken);
}
