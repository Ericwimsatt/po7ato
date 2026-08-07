import { Effect } from "effect"
import { Session } from "./Session.js"
import { eventBus } from "./orchestrator/eventBus/EventBus.js"
import type { PublisherId } from "./publisherId.js"
import type { SessionId } from "./sessionId.js"

/** Owns session lifecycle; the bus remains responsible for transport. */
export class SessionManager {
  private readonly sessions = new Map<SessionId, Session>()

  init(): this {
    Effect.runFork(
      eventBus.subscribe("SessionCreateRequested", event => {
        const session = this.createSession(event.params.workspace ?? "", event.publisherId)

        Effect.runFork(
          eventBus.publish(
            {
              kind: "SessionCreated",
              params: { requester: event.publisherId }
            },
            event.publisherId,
            {
              sessionId: session.sessionId,
              correlationId: event.correlationId,
              causationId: event.id
            }
          ).pipe(
            Effect.flatMap(created => eventBus.publish(
              {
                kind: "UserInputReceived",
                params: { text: event.params.prompt }
              },
              event.publisherId,
              {
                sessionId: session.sessionId,
                correlationId: event.correlationId,
                causationId: created.id
              }
            )),
            Effect.asVoid
          )
        )
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
    const session = new Session(workspaceRoot, creator)
    session.init()
    this.sessions.set(session.sessionId, session)
    return session
  }
}

export const sessionManager = new SessionManager().init()
