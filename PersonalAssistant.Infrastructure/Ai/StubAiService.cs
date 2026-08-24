using System.Runtime.CompilerServices;
using PersonalAssistant.Core.Ai;

namespace PersonalAssistant.Infrastructure.Ai;

public class StubAiService : IAiService
{
    public Task<AiResponse> GetResponseAsync(AiRequest request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new AiResponse
        {
            Content = $"(stub) You said: \"{request.Message}\".",
            Model = "stub-echo"
        });
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(
        AiRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var words = $"(stub) You said: \"{request.Message}\".".Split(' ');
        foreach (var w in words)
        {
            await Task.Delay(50, cancellationToken);
            yield return w + " ";
        }
    }
}
