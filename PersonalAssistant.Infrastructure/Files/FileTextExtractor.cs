using System.Text;
using PersonalAssistant.Core.Files;
using UglyToad.PdfPig;

namespace PersonalAssistant.Infrastructure.Files;

public class FileTextExtractor : IFileTextExtractor
{
    public Task<string> ExtractTextAsync(byte[] fileBytes, string fileName, CancellationToken ct)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();

        string text = ext switch
        {
            ".pdf" => ExtractPdf(fileBytes),
            ".txt" or ".md" or ".csv" => Encoding.UTF8.GetString(fileBytes),
            _ => throw new NotSupportedException($"File type '{ext}' abhi support nahi hai. PDF ya TXT use karo.")
        };

        // Bahut lamba text ko thoda cap kar do (AI limit ke liye)
        const int maxChars = 20000;
        if (text.Length > maxChars)
            text = text.Substring(0, maxChars) + "\n\n[...file bada tha, aage ka text cut kiya gaya...]";

        return Task.FromResult(text);
    }

    private static string ExtractPdf(byte[] bytes)
    {
        var sb = new StringBuilder();
        using var pdf = PdfDocument.Open(bytes);
        foreach (var page in pdf.GetPages())
        {
            sb.AppendLine(page.Text);
        }
        return sb.ToString();
    }
}
