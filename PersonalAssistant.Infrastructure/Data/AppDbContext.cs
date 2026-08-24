using Microsoft.EntityFrameworkCore;
using PersonalAssistant.Core.Entities;

namespace PersonalAssistant.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Memory> Memories => Set<Memory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
    }
}
