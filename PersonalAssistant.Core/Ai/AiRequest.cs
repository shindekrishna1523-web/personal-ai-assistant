namespace PersonalAssistant.Core.Ai;

public class AiMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class AiRequest
{
    public string Message { get; set; } = string.Empty;
    public string? ConversationId { get; set; }
    public string? SystemPrompt { get; set; }
    public List<AiMessage> History { get; set; } = new();

    // Image support (base64 + type)
    public string? ImageBase64 { get; set; }
    public string? ImageMimeType { get; set; }
}
