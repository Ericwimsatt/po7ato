import { Agent } from './agent.tsx'
import modelSelector from './modelSelector.tsx'

export const createAgent = (workspace_root: string, creator: 'User'| number) => {
    // create SessionId
    const model = modelSelector() // Based on user preferences, what's subscribed
    if (creator === 'User') {
        // Create new workspace
    }
    const agent = new Agent(sessionId, creator, workspace_root)
    return agent
};

