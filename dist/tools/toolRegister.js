import { editFileTool } from "./codingTools/editFile";
import { requestUserInputTool } from "./codingTools/requestUserInput";
import { Tool } from "./tool";
class toolRegister {
    tools = new Map();
    constructor() { }
    init() {
        eventBus.subscribe("ToolRequested", { publisherId: "ANY" }, this.onToolRequested);
    }
    buildRegister() {
        const builtInTools = [requestUserInputTool, editFileTool];
        builtInTools.forEach(tool => this.tools.set(tool.name, tool));
    }
    onToolRequested(publisherId, toolName, params) {
        const tool = this.tools.get(toolName);
        if (tool) {
            tool.execute(params);
        }
        else {
            console.error(`Tool ${toolName} not found`);
        }
        eventBus.publish("ToolExecuted", publisherId, toolName, params);
    }
}
//# sourceMappingURL=toolRegister.js.map