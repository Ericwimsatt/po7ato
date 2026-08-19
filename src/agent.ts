import { Effect } from "effect"
import type { Model, ModelMessage, ModelResponse, ToolRequest } from "./model.js"

export type AgentResponder = (text: string) => Effect.Effect<string, unknown>
export type ToolRunner = (request: ToolRequest) => Effect.Effect<unknown, unknown>
export type ToolObserver = {
  requested: (request: ToolRequest) => Effect.Effect<void, unknown>
  completed: (request: ToolRequest, response: unknown) => Effect.Effect<void, unknown>
  failed: (request: ToolRequest, error: unknown) => Effect.Effect<void, unknown>
}

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
    },
    private readonly toolRunner?: ToolRunner,
    private readonly toolObserver?: ToolObserver
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
          Effect.flatMap(response => this.resolveResponse(response, messages, onDelta)),
          Effect.map(responseText)
        )
      : this.model.stream({ messages }, onDelta).pipe(Effect.map(responseText))

    return complete
  }

  private resolveResponse(
    response: ModelResponse,
    messages: ModelMessage[],
    onDelta: (text: string) => Effect.Effect<void, unknown>
  ): Effect.Effect<ModelResponse, unknown> {
    if (response.kind !== "tool-requested") {
      return onDelta(responseText(response)).pipe(Effect.as(response))
    }
    if (this.toolRunner === undefined) return Effect.fail("Tool requests are not configured")

    const request = response.request
    const requested = this.toolObserver?.requested(request) ?? Effect.void
    const onFailure = (error: unknown) => {
      const observed = this.toolObserver?.failed(request, error) ?? Effect.void
      return observed.pipe(Effect.flatMap(() => Effect.fail(error)))
    }
    return requested.pipe(
      Effect.flatMap(() => this.toolRunner!(request)),
      Effect.tap(responseValue => this.toolObserver?.completed(request, responseValue) ?? Effect.void),
      Effect.map(responseValue => [
        ...messages,
        { role: "assistant" as const, content: "", toolCallId: request.requestId, toolName: request.toolName },
        { role: "tool" as const, content: JSON.stringify(responseValue), toolCallId: request.requestId, toolName: request.toolName }
      ]),
      Effect.flatMap(nextMessages => this.model.complete({ messages: nextMessages })),
      Effect.tap(next => onDelta(responseText(next))),
      Effect.catchAll(onFailure)
    )
  }
}
