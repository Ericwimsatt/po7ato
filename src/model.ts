import type { Effect } from "effect"

export type ModelMessage =
  | { role: "user" | "assistant"; content: string; toolCallId?: string; toolName?: string }
  | { role: "tool"; content: string; toolCallId: string; toolName: string }

export type ModelRequest = {
  messages: readonly ModelMessage[]
}

export type ModelResponse =
  | { kind: "completed"; text: string }
  | { kind: "refused"; reason: string }
  | { kind: "empty" }
  | { kind: "tool-requested"; request: ToolRequest }

export type ToolRequest = {
  requestId: string
  toolName: string
  params: unknown
}

/** The smallest model capability needed by the runtime for a single turn. */
export type Model = {
  complete: (request: ModelRequest) => Effect.Effect<ModelResponse, unknown>
  stream?: (
    request: ModelRequest,
    onDelta: (text: string) => Effect.Effect<void, unknown>
  ) => Effect.Effect<ModelResponse, unknown>
}
