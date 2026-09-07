using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PersonalAssistant.Application.Chat;
using PersonalAssistant.Core.Ai;
using PersonalAssistant.Core.Auth;
using PersonalAssistant.Infrastructure.Ai;
using PersonalAssistant.Infrastructure.Auth;
using PersonalAssistant.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Cloud (Linux) pe file-watching band karo (inotify limit crash fix)
builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
    .AddUserSecrets<Program>(optional: true)
    .AddEnvironmentVariables();
builder.Environment.EnvironmentName = "Production";

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Token daalo (bina Bearer likhe)"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient<IAiService, GeminiAiService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<PersonalAssistant.Core.Files.IFileTextExtractor, PersonalAssistant.Infrastructure.Files.FileTextExtractor>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWeb", policy =>
        policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowWeb");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/auth/register", async (RegisterDto dto, IAuthService auth, AppDbContext db, CancellationToken ct) =>
{
    var userCount = await db.Users.CountAsync(ct);
    if (userCount >= 10)
        return Results.BadRequest(new { error = "Registration is currently full. Please try again later." });

    if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.Name))
        return Results.BadRequest(new { error = "Name, email aur password zaroori hai." });

    var result = await auth.RegisterAsync(dto.Name, dto.Email, dto.Password, ct);
    return result.Success
        ? Results.Ok(new { token = result.Token, name = result.UserName })
        : Results.BadRequest(new { error = result.Error });
});

app.MapPost("/api/auth/login", async (LoginDto dto, IAuthService auth, CancellationToken ct) =>
{
    var result = await auth.LoginAsync(dto.Email, dto.Password, ct);
    return result.Success
        ? Results.Ok(new { token = result.Token, name = result.UserName })
        : Results.BadRequest(new { error = result.Error });
});

app.MapPost("/api/chat", async (ChatRequestDto dto, IChatService chatService, ClaimsPrincipal user, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Message))
        return Results.BadRequest(new { error = "Message is required." });

    var userId = GetUserId(user);
    var result = await chatService.HandleAsync(new ChatCommand(dto.Message, dto.ConversationId), userId, ct);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapGet("/api/conversations", async (AppDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var conversations = await db.Conversations
        .Where(c => c.UserId == userId)
        .OrderByDescending(c => c.UpdatedAt)
        .Select(c => new { c.Id, c.Title, c.CreatedAt, c.UpdatedAt })
        .ToListAsync(ct);

    return Results.Ok(conversations);
}).RequireAuthorization();

app.MapGet("/api/conversations/{id}", async (Guid id, AppDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var conversation = await db.Conversations
        .Where(c => c.Id == id && c.UserId == userId)
        .Select(c => new
        {
            c.Id,
            c.Title,
            Messages = c.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new { m.Role, m.Content, m.CreatedAt })
        })
        .FirstOrDefaultAsync(ct);

    return conversation is null ? Results.NotFound() : Results.Ok(conversation);
}).RequireAuthorization();

// ---- DELETE conversation ----
app.MapDelete("/api/conversations/{id}", async (Guid id, AppDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var conversation = await db.Conversations
        .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, ct);

    if (conversation is null)
        return Results.NotFound();

    // Pehle iske messages hatao, phir conversation
    var messages = db.Messages.Where(m => m.ConversationId == id);
    db.Messages.RemoveRange(messages);
    db.Conversations.Remove(conversation);
    await db.SaveChangesAsync(ct);

    return Results.Ok(new { deleted = true });
}).RequireAuthorization();

// ---- CHAT STREAM (word-by-word) ----
app.MapPost("/api/chat/stream", async (ChatRequestDto dto, IChatService chatService, ClaimsPrincipal user, HttpResponse response, AppDbContext db, CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var today = DateTime.UtcNow.Date;
    var todayCount = await db.Messages
        .Where(m => m.Role == "user" && m.CreatedAt >= today &&
               db.Conversations.Any(c => c.Id == m.ConversationId && c.UserId == userId))
        .CountAsync(ct);
    if (todayCount >= 20)
    {
        response.StatusCode = 429;
        await response.WriteAsync("Daily message limit reached (20/day). Try again tomorrow.", ct);
        return;
    }

    if (string.IsNullOrWhiteSpace(dto.Message))
    {
        response.StatusCode = 400;
        await response.WriteAsync("Message is required.");
        return;
    }

    response.Headers.Append("Content-Type", "text/event-stream");
    response.Headers.Append("Cache-Control", "no-cache");

    userId = GetUserId(user);
    await foreach (var item in chatService.StreamAsync(new ChatCommand(dto.Message, dto.ConversationId, dto.ImageBase64, dto.ImageMimeType), userId, ct))
    {
        var json = System.Text.Json.JsonSerializer.Serialize(item);
        await response.WriteAsync($"data: {json}\n\n", ct);
        await response.Body.FlushAsync(ct);
    }
}).RequireAuthorization();

// ---- MEMORY ----
app.MapGet("/api/memories", async (AppDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var memories = await db.Memories
        .Where(m => m.UserId == userId)
        .OrderBy(m => m.CreatedAt)
        .Select(m => new { m.Id, m.Content, m.CreatedAt })
        .ToListAsync(ct);
    return Results.Ok(memories);
}).RequireAuthorization();

app.MapPost("/api/memories", async (MemoryDto dto, AppDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Content))
        return Results.BadRequest(new { error = "Content is required." });

    var userId = GetUserId(user);
    var memory = new PersonalAssistant.Core.Entities.Memory
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Content = dto.Content.Trim(),
        CreatedAt = DateTime.UtcNow
    };
    db.Memories.Add(memory);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { memory.Id, memory.Content, memory.CreatedAt });
}).RequireAuthorization();

app.MapDelete("/api/memories/{id}", async (Guid id, AppDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var memory = await db.Memories.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, ct);
    if (memory is null) return Results.NotFound();
    db.Memories.Remove(memory);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { deleted = true });
}).RequireAuthorization();

// ---- FILE UPLOAD (text nikaal ke wapas) ----
app.MapPost("/api/upload", async (HttpRequest request, PersonalAssistant.Core.Files.IFileTextExtractor extractor, ClaimsPrincipal user, CancellationToken ct) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { error = "File form-data me bhejo." });

    var form = await request.ReadFormAsync(ct);
    var file = form.Files.FirstOrDefault();
    if (file is null || file.Length == 0)
        return Results.BadRequest(new { error = "Koi file nahi mili." });

    if (file.Length > 10 * 1024 * 1024)
        return Results.BadRequest(new { error = "File 10MB se choti honi chahiye." });

    using var ms = new MemoryStream();
    await file.CopyToAsync(ms, ct);

    try
    {
        var text = await extractor.ExtractTextAsync(ms.ToArray(), file.FileName, ct);
        return Results.Ok(new { fileName = file.FileName, text });
    }
    catch (NotSupportedException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch
    {
        return Results.BadRequest(new { error = "File padhne me dikkat aayi." });
    }
}).RequireAuthorization().DisableAntiforgery();


// ---- RENAME conversation ----
app.MapPut("/api/conversations/{id}", async (Guid id, RenameDto dto, AppDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.Title))
        return Results.BadRequest(new { error = "Title zaroori hai." });

    var userId = GetUserId(user);
    var conversation = await db.Conversations.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, ct);
    if (conversation is null) return Results.NotFound();

    conversation.Title = dto.Title.Trim();
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { conversation.Id, conversation.Title });
}).RequireAuthorization();

app.Run();

static Guid GetUserId(ClaimsPrincipal user)
{
    var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
    return Guid.TryParse(id, out var guid) ? guid : Guid.Empty;
}

record ChatRequestDto(string Message, string? ConversationId, string? ImageBase64 = null, string? ImageMimeType = null);
record RegisterDto(string Name, string Email, string Password);
record LoginDto(string Email, string Password);




record MemoryDto(string Content);




record LaunchDto(string App);


record RenameDto(string Title);










