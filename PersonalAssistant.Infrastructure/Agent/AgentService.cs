using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Text;
using PersonalAssistant.Core.Agent;

namespace PersonalAssistant.Infrastructure.Agent;

public class AgentService : IAgentService
{
    // SIRF ye apps launch ho sakti hai — aur kuch nahi (security)
    private static readonly Dictionary<string, string> AllowedApps = new(StringComparer.OrdinalIgnoreCase)
    {
        { "notepad", "notepad.exe" },
        { "calculator", "calc.exe" },
        { "calc", "calc.exe" },
        { "paint", "mspaint.exe" },
        { "chrome", "chrome.exe" },
        { "explorer", "explorer.exe" },
        { "settings", "ms-settings:" },
        { "visualstudio", "devenv.exe" },
        { "word", "winword.exe" },
        { "excel", "excel.exe" },
        { "cmd", "cmd.exe" },
        { "taskmanager", "taskmgr.exe" }
    };

    public AgentResult GetSystemInfo()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Machine Name: {Environment.MachineName}");
        sb.AppendLine($"OS: {Environment.OSVersion}");
        sb.AppendLine($"User: {Environment.UserName}");
        sb.AppendLine($"Processors: {Environment.ProcessorCount}");
        var mem = GC.GetTotalMemory(false) / (1024 * 1024);
        sb.AppendLine($"App Memory (approx): {mem} MB");
        sb.AppendLine($".NET Version: {Environment.Version}");
        return new AgentResult(true, sb.ToString());
    }

    public AgentResult CheckPort(int port)
    {
        if (port < 1 || port > 65535)
            return new AgentResult(false, "Port 1-65535 ke beech hona chahiye.");

        var props = IPGlobalProperties.GetIPGlobalProperties();
        var listeners = props.GetActiveTcpListeners();
        bool inUse = listeners.Any(l => l.Port == port);

        return new AgentResult(true,
            inUse ? $"Port {port} BUSY hai (kuch chal raha hai)." : $"Port {port} FREE hai.");
    }

    public AgentResult LaunchApp(string appName)
    {
        if (string.IsNullOrWhiteSpace(appName) || !AllowedApps.TryGetValue(appName.Trim(), out var exe))
        {
            var allowed = string.Join(", ", AllowedApps.Keys.Distinct());
            return new AgentResult(false, $"'{appName}' allowed nahi hai. Sirf ye chal sakti hai: {allowed}");
        }

        try
        {
            Process.Start(new ProcessStartInfo { FileName = exe, UseShellExecute = true });
            return new AgentResult(true, $"{appName} launch kar diya.");
        }
        catch (Exception ex)
        {
            return new AgentResult(false, $"Launch nahi hua: {ex.Message}");
        }
    }

    public AgentResult GetDiskInfo()
    {
        var sb = new StringBuilder();
        foreach (var drive in DriveInfo.GetDrives())
        {
            if (!drive.IsReady) continue;
            var totalGb = drive.TotalSize / (1024.0 * 1024 * 1024);
            var freeGb = drive.AvailableFreeSpace / (1024.0 * 1024 * 1024);
            var usedGb = totalGb - freeGb;
            sb.AppendLine($"Drive {drive.Name}");
            sb.AppendLine($"  Total: {totalGb:F1} GB");
            sb.AppendLine($"  Used:  {usedGb:F1} GB");
            sb.AppendLine($"  Free:  {freeGb:F1} GB");
        }
        return new AgentResult(true, sb.ToString());
    }

    public AgentResult GetRunningApps()
    {
        var sb = new StringBuilder();
        sb.AppendLine("Top apps (memory ke hisaab se):");
        var procs = Process.GetProcesses()
            .Where(p => !string.IsNullOrEmpty(p.MainWindowTitle))
            .OrderByDescending(p => { try { return p.WorkingSet64; } catch { return 0L; } })
            .Take(10);

        foreach (var p in procs)
        {
            try
            {
                var memMb = p.WorkingSet64 / (1024 * 1024);
                sb.AppendLine($"  {p.ProcessName} - {memMb} MB");
            }
            catch { }
        }
        return new AgentResult(true, sb.ToString());
    }
}


