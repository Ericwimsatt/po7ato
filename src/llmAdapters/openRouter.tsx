import { Data, Effect } from "effect"
import modelSelector from "../modelSelector.js"
import type { Model, ModelMessage, ModelRequest, ModelResponse } from "../model.js"

const endpoint = "https://openrouter.ai/api/v1/chat/completions"

class OpenRouterError extends Data.TaggedError("OpenRouterError")<{
  message: string
  cause: unknown
}> {}

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: unknown; refusal?: unknown } }>
  error?: { message?: unknown }
}

type OpenRouterChunk = {
  choices?: Array<{ delta?: { content?: unknown; refusal?: unknown } }>
}

const parseResponse = (body: OpenRouterResponse): ModelResponse => {
  const choice = body.choices?.[0]?.message
  if (typeof choice?.refusal === "string" && choice.refusal.length > 0) {
    return { kind: "refused", reason: choice.refusal }
  }

  if (typeof choice?.content !== "string" || choice.content.length === 0) {
    return { kind: "empty" }
  }

  return { kind: "completed", text: choice.content }
}

export const createOpenRouterModel = (options: {
  apiKey?: string
  model?: string
  fetcher?: typeof fetch
} = {}): Model => {
  const call = (messages: readonly ModelMessage[], body: Record<string, unknown>, onResponse: (response: Response) => Promise<ModelResponse>) => Effect.tryPromise({
    try: async () => {
      const apiKey = options.apiKey ?? process.env.OPENROUTER_KEY
      if (!apiKey) throw new OpenRouterError({ message: "OPENROUTER_KEY is not configured", cause: undefined })

      const fetcher = options.fetcher ?? fetch
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
          ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {})
        },
        body: JSON.stringify({
          model: options.model ?? modelSelector(),
          messages,
          ...body
        })
      })

      if (!response.ok) {
        const errorBody = await response.json() as OpenRouterResponse
        throw new OpenRouterError({
          message: typeof errorBody.error?.message === "string" ? errorBody.error.message : `OpenRouter request failed (${response.status})`,
          cause: errorBody.error
        })
      }
      return onResponse(response)
    },
    catch: error => error instanceof OpenRouterError
      ? error
      : new OpenRouterError({ message: String(error), cause: error })
  })

  return {
    complete: requestBody => call(requestBody.messages, { stream: false }, async response => parseResponse(await response.json() as OpenRouterResponse)),
    stream: (requestBody, onDelta) => call(requestBody.messages, { stream: true }, async response => {
      if (response.body === null) throw new OpenRouterError({ message: "OpenRouter returned no response body", cause: undefined })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let text = ""
      let refusal = ""

      const processLine = async (line: string) => {
        if (!line.startsWith("data:")) return
        const data = line.slice(5).trim()
        if (data === "[DONE]" || data.length === 0) return
        const chunk = JSON.parse(data) as OpenRouterChunk
        const delta = chunk.choices?.[0]?.delta
        if (typeof delta?.refusal === "string") refusal += delta.refusal
        if (typeof delta?.content === "string" && delta.content.length > 0) {
          text += delta.content
          await Effect.runPromise(onDelta(delta.content))
        }
      }

      while (true) {
        const result = await reader.read()
        buffer += decoder.decode(result.value, { stream: !result.done })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) await processLine(line.trimEnd())
        if (result.done) break
      }
      if (buffer.length > 0) await processLine(buffer.trimEnd())
      if (refusal.length > 0) return { kind: "refused", reason: refusal }
      return text.length > 0 ? { kind: "completed", text } : { kind: "empty" }
    })
  }
}
