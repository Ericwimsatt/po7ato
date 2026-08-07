import { Effect } from "effect"
import { Agent } from "./agent.js"
import { SessionBus } from "./orchestrator/eventBus/EventBus.js"
import { eventBus } from "./orchestrator/eventBus/EventBus.js"
import type { PublisherId } from "./publisherId.js"
import { generateSessionId, type SessionId } from "./sessionId.js"

/** The runtime and event boundary for one end-user session. */
export class Session {
  public readonly sessionId: SessionId = generateSessionId()
  public readonly bus = new SessionBus(this.sessionId, eventBus)
  private readonly agent: Agent

  constructor(
    private readonly workspaceRoot: string,
    private readonly creator: PublisherId
  ) {
    this.agent = new Agent(this.sessionId, creator, workspaceRoot, this.bus)
  }

  init(): void {
    Effect.runFork(
      this.bus.subscribe("UserInputReceived", event => {
        Effect.runFork(this.agent.handleInput(event.params.text, event))
      })
    )
  }

  close(reason: string): Effect.Effect<void> {
    return this.bus.publish(
      { kind: "SessionClosed", params: { reason } },
      this.creator
    ).pipe(Effect.asVoid)
  }
}
