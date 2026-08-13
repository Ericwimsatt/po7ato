import type { Effect } from "effect"

export type ModelMessage = {
  role: "user" | "assistant"
  content: string
}

export type ModelRequest = {
  messages: readonly ModelMessage[]
}

export type ModelResponse =
  | { kind: "completed"; text: string }
  | { kind: "refused"; reason: string }
  | { kind: "empty" }

/** The smallest model capability needed by the runtime for a single turn. */
export type Model = {
  complete: (request: ModelRequest) => Effect.Effect<ModelResponse, unknown>
  stream?: (
    request: ModelRequest,
    onDelta: (text: string) => Effect.Effect<void, unknown>
  ) => Effect.Effect<ModelResponse, unknown>
}
