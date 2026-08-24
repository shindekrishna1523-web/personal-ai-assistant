namespace PersonalAssistant.Core.Files;

public interface IFileTextExtractor
{
    // File ka content byte[] me, filename se type pata chalega. Text wapas.
    Task<string> ExtractTextAsync(byte[] fileBytes, string fileName, CancellationToken ct);
}
