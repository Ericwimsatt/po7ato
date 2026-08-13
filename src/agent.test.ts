import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { Agent } from "./agent.js"
import type { Model, ModelMessage, ModelRequest, ModelResponse } from "./model.js"

const fakeModel = (
  response: ModelResponse,
  requests: ModelRequest[]
): Model => ({
  complete: request => {
    requests.push(request)
    return Effect.succeed(response)
  }
})

describe("Phase 2 model boundary", () => {
  it("sends a model-shaped request and shows its response", async () => {
    const requests: ModelRequest[] = []
    const agent = new Agent(fakeModel({ kind: "completed", text: "answer" }, requests))

    await expect(Effect.runPromise(agent.handleInput("question"))).resolves.toBe("answer")
    expect(requests).toEqual([{ messages: [{ role: "user", content: "question" }] }])
  })

  it("makes refusal and empty model results visible", async () => {
    const refusal = new Agent(fakeModel({ kind: "refused", reason: "unsafe" }, []))
    const empty = new Agent(fakeModel({ kind: "empty" }, []))

    await expect(Effect.runPromise(refusal.handleInput("question"))).resolves.toContain("refused")
    await expect(Effect.runPromise(empty.handleInput("question"))).resolves.toBe("[model returned no output]")
  })

  it("preserves model failures", async () => {
    const model: Model = { complete: () => Effect.fail("model unavailable") }

    await expect(Effect.runPromise(new Agent(model).handleInput("question"))).rejects.toThrow("model unavailable")
  })

  it("sends prior exchanges on a follow-up turn", async () => {
    const requests: ModelRequest[] = []
    const model: Model = {
      complete: request => {
        requests.push(request)
        return Effect.succeed({ kind: "completed" as const, text: `reply ${requests.length}` })
      }
    }
    const agent = new Agent(model)

    const history: ModelMessage[] = []
    const first = await Effect.runPromise(agent.handleInput("first", history))
    history.push({ role: "user", content: "first" }, { role: "assistant", content: first })
    await Effect.runPromise(agent.handleInput("second", history))

    expect(requests[1]?.messages).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "reply 1" },
      { role: "user", content: "second" }
    ])
  })
})
