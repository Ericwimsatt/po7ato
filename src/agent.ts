import { Effect } from "effect"
import type { EventEnvelope, SessionBus } from "./orchestrator/eventBus/EventBus.js"
import type { PublisherId } from "./publisherId.js"
import type { SessionId } from "./sessionId.js"

/** Stub for the model-facing agent loop. */
export class Agent {
  constructor(
    private readonly sessionId: SessionId,
    private readonly publisherId: PublisherId,
    private readonly workspaceRoot: string,
    private readonly bus: SessionBus
  ) {}

  handleInput(
    text: string,
    inputEvent: EventEnvelope<"UserInputReceived">
  ): Effect.Effect<void> {
    const turnId = crypto.randomUUID()
    const metadata = {
      correlationId: inputEvent.correlationId,
      causationId: inputEvent.id
    }

    return this.bus.publish(
      { kind: "AgentTurnStarted", params: { turnId } },
      this.publisherId,
      metadata
    ).pipe(
      Effect.flatMap(started => this.bus.publish(
        {
          kind: "AgentOutputDelta",
          params: { turnId, text: `[stub agent response to: ${text}]` }
        },
        this.publisherId,
        { correlationId: inputEvent.correlationId, causationId: started.id }
      )),
      Effect.flatMap(output => this.bus.publish(
        { kind: "AgentTurnFinished", params: { turnId } },
        this.publisherId,
        { correlationId: inputEvent.correlationId, causationId: output.id }
      )),
      Effect.asVoid
    )
  }
}
