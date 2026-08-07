import type { Effect } from "effect"
import type { SessionBus } from "../orchestrator/eventBus/EventBus.js"
import type { PublisherId } from "../publisherId.js"
import type { SessionId } from "../sessionId.js"

export type ToolContext = {
  sessionId: SessionId
  requestId: string
  publisherId: PublisherId
  bus: SessionBus
}

export class Tool {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly execute: (
      params: unknown,
      context: ToolContext
    ) => Effect<unknown, unknown, never>
  ) {}
}
