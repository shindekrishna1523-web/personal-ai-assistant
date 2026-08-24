namespace PersonalAssistant.Core.Agent;

public record AgentResult(bool Success, string Output);

public interface IAgentService
{
    AgentResult GetSystemInfo();
    AgentResult CheckPort(int port);
    AgentResult LaunchApp(string appName);
    AgentResult GetDiskInfo();
    AgentResult GetRunningApps();
}
