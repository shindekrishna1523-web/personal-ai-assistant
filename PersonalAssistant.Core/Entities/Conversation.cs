namespace PersonalAssistant.Core.Entities;

public class Conversation
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<Message> Messages { get; set; } = new();
}
