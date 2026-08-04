/*THIS IS A SERVER THAT CONNECTS TO THE END USER. A user interface will touch this directly, and this server will in turn be responsible 
everything else 
    */
import { eventBus } from './orchestrator/eventBus/EventBus.js'
import type { PublisherId } from './publisherId.js';

const requestAgent = (params: { prompt: string, mode: "build" | "plan" | "ask", workspace?: string }, publisherId: PublisherId) => {
    return eventBus.publish(
        { kind: "AgentSessionRequested", params },
        publisherId
    )
}

export { requestAgent }