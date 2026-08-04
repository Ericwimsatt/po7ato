import { Agent } from './agent.js';
import modelSelector from './modelSelector.js';
export const createAgent = (workspace_root, creator) => {
    // create SessionId
    const model = modelSelector(); // Based on user preferences, what's subscribed
    if (creator === 'User') {
        // Create new workspace
    }
    const agent = new Agent(sessionId, creator, workspace_root);
    return agent;
};
//# sourceMappingURL=createAgent.js.map