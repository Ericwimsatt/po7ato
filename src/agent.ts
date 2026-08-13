import { Effect } from "effect"
import type { Model, ModelMessage, ModelResponse } from "./model.js"

export type AgentResponder = (text: string) => Effect.Effect<string, unknown>

const legacyResponderModel = (responder: AgentResponder): Model => ({
  complete: request => responder(request.messages.at(-1)?.content ?? "").pipe(
    Effect.map(text => ({ kind: "completed" as const, text }))
  )
})

const responseText = (response: ModelResponse): string => {
  if (response.kind === "completed") return response.text || "[model returned no output]"
  if (response.kind === "refused") return `[model refused to answer: ${response.reason}]`
  return "[model returned no output]"
}

/** Model-facing agent boundary. Conversation history is added in Phase 2.3. */
export class Agent {
  private readonly model: Model

  constructor(
    model: Model | AgentResponder = {
      complete: request => Effect.succeed({
        kind: "completed" as const,
        text: `[stub agent response to: ${request.messages.at(-1)?.content ?? ""}]`
      })
    }
  ) {
    this.model = typeof model === "function" ? legacyResponderModel(model) : model
  }

  handleInput(text: string, history: readonly ModelMessage[] = []): Effect.Effect<string, unknown> {
    return this.handleInputStreaming(text, history, () => Effect.void)
  }

  handleInputStreaming(
    text: string,
    history: readonly ModelMessage[],
    onDelta: (text: string) => Effect.Effect<void, unknown>
  ): Effect.Effect<string, unknown> {
    const userMessage: ModelMessage = { role: "user", content: text }
    const messages = [...history, userMessage]
    const complete = this.model.stream === undefined
      ? this.model.complete({ messages }).pipe(
          Effect.tap(response => onDelta(responseText(response))),
          Effect.map(responseText)
        )
      : this.model.stream({ messages }, onDelta).pipe(Effect.map(responseText))

    return complete
  }
}
