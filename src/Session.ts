import { Effect } from "effect"
import { Agent, type AgentResponder } from "./agent.js"
import type { Model } from "./model.js"
import type { ModelMessage } from "./model.js"
import { SessionBus, type EventEnvelope } from "./orchestrator/eventBus/EventBus.js"
import { eventBus } from "./orchestrator/eventBus/EventBus.js"
import type { PublisherId } from "./publisherId.js"
import { generateSessionId, type SessionId } from "./sessionId.js"

/** The runtime and event boundary for one end-user session. */
export class Session {
  public readonly sessionId: SessionId = generateSessionId()
  public readonly bus = new SessionBus(this.sessionId, eventBus)
  private readonly agent: Agent
  private readonly history: ModelMessage[] = []

  constructor(
    private readonly workspaceRoot: string,
    private readonly creator: PublisherId,
    model?: Model | AgentResponder
  ) {
    void this.workspaceRoot
    this.agent = new Agent(model)
  }

  init(): void {
    Effect.runFork(this.bus.publish(
      { kind: "SessionStarted", params: { sessionId: this.sessionId } }, this.creator
    ).pipe(Effect.asVoid))

    Effect.runFork(
      this.bus.subscribe("UserInputReceived", event => {
        Effect.runFork(this.handleInput(event.params.text, event))
      })
    )
  }

  private handleInput(text: string, inputEvent: EventEnvelope<"UserInputReceived">): Effect.Effect<void> {
    const turnId = crypto.randomUUID()
    const metadata = { correlationId: inputEvent.correlationId, causationId: inputEvent.id }

    return this.bus.publish(
      { kind: "AgentTurnStarted", params: { turnId } }, this.creator, metadata
    ).pipe(
      Effect.flatMap(turnStarted => this.agent.handleInputStreaming(
        text,
        this.history,
        delta => this.bus.publish(
          { kind: "AgentOutputDelta", params: { turnId, text: delta } }, this.creator,
          { correlationId: inputEvent.correlationId, causationId: turnStarted.id }
        ).pipe(Effect.asVoid)
      ).pipe(
        Effect.tap(response => {
          this.history.push({ role: "user", content: text }, { role: "assistant", content: response })
        }),
        Effect.flatMap(output => this.bus.publish(
          { kind: "AgentTurnFinished", params: { turnId } }, this.creator,
          { correlationId: inputEvent.correlationId, causationId: output.id }
        ).pipe(Effect.asVoid))
      )),
      Effect.catchAll(error => this.bus.publish(
        {
          kind: "AgentTurnFailed",
          params: { turnId, error: String(error) }
        }, this.creator,
        { correlationId: inputEvent.correlationId, causationId: inputEvent.id }
      ).pipe(Effect.asVoid)),
      Effect.asVoid
    )
  }

  close(reason: string): Effect.Effect<void> {
    return this.bus.publish(
      { kind: "SessionClosed", params: { reason } },
      this.creator
    ).pipe(
      Effect.flatMap(closed => this.bus.publish(
        { kind: "SessionFinished", params: { sessionId: this.sessionId, reason: "closed" } },
        this.creator,
        { causationId: closed.id }
      )),
      Effect.asVoid
    )
  }
}
