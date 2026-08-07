import { eventBus } from "./orchestrator/eventBus/EventBus.js"
import type { AgentMode } from "./orchestrator/eventBus/EventBus.js"
import type { PublisherId } from "./publisherId.js"

export const requestAgent = (
  params: { prompt: string; mode: AgentMode; workspace?: string },
  publisherId: PublisherId
) => eventBus.publish(
  { kind: "SessionCreateRequested", params },
  publisherId
)

export const submitUserInput = (
  sessionId: import("./sessionId.js").SessionId,
  text: string,
  publisherId: PublisherId
) => eventBus.publish(
  { kind: "UserInputReceived", params: { text } },
  publisherId,
  { sessionId }
)
