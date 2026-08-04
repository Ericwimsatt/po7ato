import { Effect } from 'effect';

import { Agent } from './agent.js'
import modelSelector from './modelSelector.js'
import { generateSessionId } from './sessionId.js'
import { eventBus } from './orchestrator/eventBus/EventBus.js'
import type { PublisherId } from './publisherId.js';
import type { SessionId } from './sessionId.js'
import { Session } from './Session.js';

export class SessionHandler {
    hashmap: Map<SessionId, Session> = new Map()
    constructor() {
    }
    init = () => {
        Effect.runFork(
            eventBus.subscribe("AgentSessionRequested", (event) => {
                const { prompt, mode, workspace } = event.params;
                console.log("Agent session requested with params:", prompt, mode, workspace);
                this.createSession(workspace ?? "", event.publisherId)
            })
        )
    }

    private createSession = (workspace_root: string, creator: PublisherId) => {
        if (creator === 'User') {
            // Create new workspace
        }
        const session = new Session(workspace_root, creator)
        session.init()
        this.hashmap.set(session.sessionId, session)
        Effect.runFork(
            eventBus.publish(
                { kind: "AgentSessionStarted", params: { sessionId: session.sessionId, requester: creator } },
                creator
            )
        )
        return session
    };

    public joinSession = (sessionId: SessionId, participant: PublisherId) => {
}

export const sessionHandler= new SessionHandler().init()