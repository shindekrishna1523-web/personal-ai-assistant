using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PersonalAssistant.Core.Auth;
using PersonalAssistant.Core.Entities;
using PersonalAssistant.Infrastructure.Data;

namespace PersonalAssistant.Infrastructure.Auth;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly string _jwtKey;

    public AuthService(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _jwtKey = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key nahi mili. User secrets me daalo.");
    }

    public async Task<AuthResult> RegisterAsync(string name, string email, string password, CancellationToken ct)
    {
        email = email.Trim().ToLowerInvariant();

        var exists = await _db.Users.AnyAsync(u => u.Email == email, ct);
        if (exists)
            return new AuthResult(false, null, "Ye email pehle se registered hai.", null);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        return new AuthResult(true, GenerateToken(user), null, user.Name);
    }

    public async Task<AuthResult> LoginAsync(string email, string password, CancellationToken ct)
    {
        email = email.Trim().ToLowerInvariant();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return new AuthResult(false, null, "Email ya password galat hai.", null);

        return new AuthResult(true, GenerateToken(user), null, user.Name);
    }

    private string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
