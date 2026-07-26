//import pubsub from effect
import { tools } from "../../tools/tools";
type PublisherId = "USER"| "ORCHESTRATOR" | string;
type orchestratorEvent = 
    | { kind: "AgentSessionRequested", sessionId: string, prompt: string, mode: "build"| "plan" | "ask"}
    | { kind: "AgentSessionStarted", agentName: string, sessionTitle?: string, prompt?: string, creator?: string }
    | { kind: "AgentSessionFinished"}
    | { kind: "ToolRequested", tool: tools,  requestId: string }
    | { kind: "ToolResponse",  tool: tools, requestId: string, response: any }
    | { kind: "user-input-requested", questions: any[] }

function publishEvent(event: orchestratorEvent, publisherId: string) {

}