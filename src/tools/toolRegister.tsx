import { editFileTool } from "./codingTools/editFile";
import { requestUserInputTool } from "./codingTools/requestUserInput";
import { Tool } from "./tool";
class toolRegister {
    private tools: Map<string, Tool> = new Map()

    constructor() {}
    init() {
        eventBus.subscribe("ToolRequested", { publisherId: "ANY" }, this.onToolRequested)
    }

    buildRegister() {
        const builtInTools = [requestUserInputTool, editFileTool]
        builtInTools.forEach(tool => this.tools.set(tool.name, tool))
    }

    onToolRequested(publisherId: string, toolName: string, params: any) {
        const tool = this.tools.get(toolName)
        if (tool) {
            tool.execute(params)
        } else {
            console.error(`Tool ${toolName} not found`)
        }
        eventBus.publish("ToolExecuted", publisherId, toolName, params)
    }

    

    
}
