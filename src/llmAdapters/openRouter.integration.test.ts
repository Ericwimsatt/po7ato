import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { createOpenRouterModel } from "./openRouter.js"

const enabled = process.env.OPENROUTER_INTEGRATION === "1" && Boolean(process.env.OPENROUTER_KEY)

describe.skipIf(!enabled)("OpenRouter integration", () => {
  it("returns non-empty output from the configured free route", async () => {
    const response = await Effect.runPromise(createOpenRouterModel().complete({
      messages: [{ role: "user", content: "Reply with exactly one short greeting." }]
    }))

    expect(response.kind).toBe("completed")
    if (response.kind === "completed") expect(response.text.trim()).not.toBe("")
  }, 30_000)
})
