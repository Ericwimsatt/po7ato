import { describe, expect, it, vi } from "vitest"
import { Effect } from "effect"
import { createOpenRouterModel } from "./openRouter.js"

describe("OpenRouter model", () => {
  it("sends a single-turn chat completion request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "hello" } }]
    }), { status: 200 }))

    const response = await Effect.runPromise(createOpenRouterModel({ apiKey: "test-key", fetcher }).complete({
      messages: [{ role: "user", content: "hi" }]
    }))

    expect(response).toEqual({ kind: "completed", text: "hello" })
    expect(fetcher).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
        body: expect.stringContaining('"model":"openrouter/free"')
      })
    )
  })

  it("reports provider failures without hiding them", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { message: "rate limited" }
    }), { status: 429 }))

    await expect(Effect.runPromise(createOpenRouterModel({ apiKey: "test-key", fetcher }).complete({ messages: [] })))
      .rejects.toThrow("rate limited")
  })

  it("assembles streamed deltas and exposes them as they arrive", async () => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
      "data: [DONE]\n\n"
    ]
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
        controller.close()
      }
    })
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(stream, { status: 200 }))
    const deltas: string[] = []

    const response = await Effect.runPromise(createOpenRouterModel({ apiKey: "test-key", fetcher }).stream!({
      messages: [{ role: "user", content: "hi" }]
    }, text => Effect.sync(() => { deltas.push(text) })))

    expect(deltas).toEqual(["hel", "lo"])
    expect(response).toEqual({ kind: "completed", text: "hello" })
  })
})
