import { Effect } from 'effect';
import { Agent } from './agent.js';
import modelSelector from './modelSelector.js';
import { generateSessionId } from './sessionId.js';
import { eventBus } from './orchestrator/eventBus/EventBus.js';
export const createAgent = (workspace_root, creator) => {
    const sessionId = generateSessionId();
    const model = modelSelector(); // Based on user preferences, what's subscribed
    if (creator === 'User') {
        // Create new workspace
    }
    const agent = new Agent(sessionId, creator, workspace_root);
    return agent;
};
eventBus.subscribe(("AgentSessionRequested"), (params) => {
    const { sessionId, prompt, mode } = params;
    console.log("Agent session requested with params:", sessionId, prompt, mode);
    return Effect.succeed(undefined);
});
//# sourceMappingURL=AgentHandler.js.map