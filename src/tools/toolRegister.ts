import { Effect } from "effect";
import { editFileTool } from "./codingTools/editFile";
import { requestUserInputTool } from "./codingTools/requestUserInput";
import { Tool } from "./tool";
import { eventBus } from "../orchestrator/eventBus/EventBus.js";

class toolRegister {
    private tools: Map<string, Tool> = new Map()

    constructor() {}
    init() {
        Effect.runFork(
            eventBus.subscribe("ToolRequested", (event) => {
                const { tool, requestId } = event.params;
                const toolInstance = this.tools.get(tool.name)
                if (toolInstance) {
                    toolInstance.execute({}, event.publisherId)
                }
                eventBus.publish({ kind: "ToolExecuted", params: { toolName: tool.name, params: {} } }, event.publisherId)
            })
        )
    }

    buildRegister() {
        const builtInTools = [requestUserInputTool, editFileTool]
        builtInTools.forEach(tool => this.tools.set(tool.name, tool))
    }

    
}
