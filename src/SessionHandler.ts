import { Effect } from "effect"
import { Session } from "./Session.js"
import { eventBus } from "./orchestrator/eventBus/EventBus.js"
import type { PublisherId } from "./publisherId.js"
import type { SessionId } from "./sessionId.js"
import { createOpenRouterModel } from "./llmAdapters/openRouter.js"

/** Owns session lifecycle; the bus remains responsible for transport. */
export class SessionManager {
  private readonly sessions = new Map<SessionId, Session>()

  init(): this {
    Effect.runFork(
      eventBus.subscribe("SessionCreateRequested", event => {
        const session = this.createSession(event.params.workspace ?? "", event.publisherId)

        Effect.runFork(eventBus.publish(
          { kind: "SessionCreateSuccessful", params: { sessionId: session.sessionId } },
          event.publisherId,
          { correlationId: event.correlationId, causationId: event.id }
        ))
      })
    )
    return this
  }

  get(sessionId: SessionId): Session | undefined {
    return this.sessions.get(sessionId)
  }

  joinSession(sessionId: SessionId, participant: PublisherId): Session | undefined {
    // Membership and authorization will be added here.
    void participant
    return this.sessions.get(sessionId)
  }

  private createSession(workspaceRoot: string, creator: PublisherId): Session {
    const session = new Session(workspaceRoot, creator, createOpenRouterModel())
    session.init()
    this.sessions.set(session.sessionId, session)
    return session
  }
}

export const sessionManager = new SessionManager().init()
