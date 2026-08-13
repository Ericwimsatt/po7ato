import { Effect } from "effect"
import { eventBus, EventBus, type AgentMode, type AnyEvent } from "./orchestrator/eventBus/EventBus.js"
import { generatePublisherId, type PublisherId } from "./publisherId.js"
import type { SessionId } from "./sessionId.js"

/** The client-facing event system. A CLI is one possible client implementation. */
export class Client {
  readonly events = new EventBus()
  private readonly pending = new Map<string, (sessionId: SessionId) => void>()

  constructor(
    private readonly coreBus: EventBus = eventBus,
    private readonly publisherId: PublisherId = generatePublisherId()
  ) {
    Effect.runFork(this.coreBus.subscribeAll(event => {
      if (event.sessionId !== undefined) {
        Effect.runFork(this.events.publishAny(event))
      }

      if (event.kind === "SessionCreateSuccessful") {
        this.pending.get(event.correlationId)?.(event.params.sessionId)
        this.pending.delete(event.correlationId)
      }
    }))
  }

  createSession(prompt: string, workspace = ""): Promise<SessionId> {
    const correlationId = crypto.randomUUID()
    const created = new Promise<SessionId>(resolve => this.pending.set(correlationId, resolve))
    Effect.runFork(this.coreBus.publish(
      { kind: "SessionCreateRequested", params: { prompt, mode: "ask", workspace } },
      this.publisherId,
      { correlationId }
    ))
    return created
  }

  sendInput(sessionId: SessionId, text: string): void {
    Effect.runFork(this.coreBus.publish(
      { kind: "UserInputReceived", params: { text } },
      this.publisherId,
      { sessionId }
    ))
  }

  subscribeToSession(sessionId: SessionId, handler: (event: AnyEvent) => void): void {
    Effect.runFork(this.events.subscribeToSession(sessionId, handler))
  }
}

export const requestAgent = (
  params: { prompt: string; mode: AgentMode; workspace?: string },
  publisherId: PublisherId
) => eventBus.publish(
  { kind: "SessionCreateRequested", params },
  publisherId
)

export const submitUserInput = (
  sessionId: SessionId,
  text: string,
  publisherId: PublisherId
) => eventBus.publish(
  { kind: "UserInputReceived", params: { text } },
  publisherId,
  { sessionId }
)
