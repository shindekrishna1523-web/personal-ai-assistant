using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PersonalAssistant.Core.Ai;
using PersonalAssistant.Core.Entities;
using PersonalAssistant.Infrastructure.Data;

namespace PersonalAssistant.Application.Chat;

public record ChatCommand(string Message, string? ConversationId, string? ImageBase64 = null, string? ImageMimeType = null);
public record ChatResult(string Reply, string Model, string ConversationId);

public interface IChatService
{
    Task<ChatResult> HandleAsync(ChatCommand command, Guid userId, CancellationToken cancellationToken);
    IAsyncEnumerable<object> StreamAsync(ChatCommand command, Guid userId, CancellationToken cancellationToken);
}

public class ChatService : IChatService
{
    private readonly IAiService _aiService;
    private readonly AppDbContext _db;

    public ChatService(IAiService aiService, AppDbContext db)
    {
        _aiService = aiService;
        _db = db;
    }

    private async Task<string> BuildSystemPromptAsync(Guid userId, CancellationToken ct)
    {
        var basePrompt = "You are a helpful personal assistant and an expert software developer. Reply in the same language the user uses. When writing code, always use proper markdown code blocks with the correct language tag (like ```python or ```csharp). Explain code clearly and concisely. When the user shares an error, identify the root cause and give a step-by-step fix.";

        var memories = await _db.Memories
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.Content)
            .ToListAsync(ct);

        if (memories.Count == 0)
            return basePrompt;

        var sb = new StringBuilder(basePrompt);
        sb.Append("\n\nHere are some things you remember about the user:\n");
        foreach (var mem in memories)
            sb.Append("- ").Append(mem).Append('\n');

        return sb.ToString();
    }

    private async Task<(Conversation conv, List<AiMessage> history, bool isNew)> PrepareAsync(
        ChatCommand command, Guid userId, CancellationToken ct)
    {
        Conversation conversation;
        bool isNew = false;

        if (!string.IsNullOrWhiteSpace(command.ConversationId) &&
            Guid.TryParse(command.ConversationId, out var convId))
        {
            var existing = await _db.Conversations
                .FirstOrDefaultAsync(c => c.Id == convId && c.UserId == userId, ct);
            if (existing is null) { conversation = CreateConversation(userId, command.Message); isNew = true; }
            else { conversation = existing; }
        }
        else
        {
            conversation = CreateConversation(userId, command.Message);
            isNew = true;
        }

        if (isNew) _db.Conversations.Add(conversation);

        var history = new List<AiMessage>();
        if (!isNew)
        {
            history = await _db.Messages
                .Where(m => m.ConversationId == conversation.Id)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new AiMessage { Role = m.Role, Content = m.Content })
                .ToListAsync(ct);
        }

        return (conversation, history, isNew);
    }

    public async Task<ChatResult> HandleAsync(ChatCommand command, Guid userId, CancellationToken ct)
    {
        var (conversation, history, _) = await PrepareAsync(command, userId, ct);

        _db.Messages.Add(new Message
        {
            Id = Guid.NewGuid(), ConversationId = conversation.Id,
            Role = "user", Content = command.Message, CreatedAt = DateTime.UtcNow
        });

        var request = new AiRequest
        {
            Message = command.Message,
            ConversationId = conversation.Id.ToString(),
            SystemPrompt = await BuildSystemPromptAsync(userId, ct),
            History = history,
            ImageBase64 = command.ImageBase64,
            ImageMimeType = command.ImageMimeType
        };
        var response = await _aiService.GetResponseAsync(request, ct);

        _db.Messages.Add(new Message
        {
            Id = Guid.NewGuid(), ConversationId = conversation.Id,
            Role = "assistant", Content = response.Content, CreatedAt = DateTime.UtcNow
        });
        conversation.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new ChatResult(response.Content, response.Model, conversation.Id.ToString());
    }

    public async IAsyncEnumerable<object> StreamAsync(
        ChatCommand command, Guid userId, [EnumeratorCancellation] CancellationToken ct)
    {
        var (conversation, history, _) = await PrepareAsync(command, userId, ct);

        yield return new { type = "meta", conversationId = conversation.Id.ToString() };

        _db.Messages.Add(new Message
        {
            Id = Guid.NewGuid(), ConversationId = conversation.Id,
            Role = "user", Content = command.Message, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);

        var request = new AiRequest
        {
            Message = command.Message,
            ConversationId = conversation.Id.ToString(),
            SystemPrompt = await BuildSystemPromptAsync(userId, ct),
            History = history,
            ImageBase64 = command.ImageBase64,
            ImageMimeType = command.ImageMimeType
        };

        var full = new StringBuilder();
        await foreach (var chunk in _aiService.StreamResponseAsync(request, ct))
        {
            full.Append(chunk);
            yield return new { type = "chunk", text = chunk };
        }

        _db.Messages.Add(new Message
        {
            Id = Guid.NewGuid(), ConversationId = conversation.Id,
            Role = "assistant", Content = full.ToString(), CreatedAt = DateTime.UtcNow
        });
        conversation.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        yield return new { type = "done" };
    }

    private static Conversation CreateConversation(Guid userId, string firstMessage)
    {
        var title = firstMessage.Length > 40 ? firstMessage.Substring(0, 40) : firstMessage;
        return new Conversation
        {
            Id = Guid.NewGuid(), UserId = userId, Title = title,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
    }
}


