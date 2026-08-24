namespace PersonalAssistant.Core.Auth;

public record AuthResult(bool Success, string? Token, string? Error, string? UserName);

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(string name, string email, string password, CancellationToken ct);
    Task<AuthResult> LoginAsync(string email, string password, CancellationToken ct);
}
