import { Readable } from "node:stream"
import { describe, expect, it, vi } from "vitest"
import { runCli } from "./cli.js"
import type { Client } from "./User.js"
import type { AnyEvent } from "./orchestrator/eventBus/EventBus.js"

describe("CLI session reuse", () => {
  it("uses one session for multiple input lines", async () => {
    let handler: ((event: AnyEvent) => void) | undefined
    const sessionId = "session-1" as never
    const client = {
      createSession: vi.fn(async () => sessionId),
      subscribeToSession: vi.fn((_id: unknown, next: (event: AnyEvent) => void) => {
        handler = next
      }),
      sendInput: vi.fn((_id: unknown, text: string) => {
        handler?.({ kind: "AgentTurnStarted", params: { turnId: text } } as AnyEvent)
        handler?.({ kind: "AgentOutputDelta", params: { turnId: text, text: `reply to ${text}` } } as AnyEvent)
        handler?.({ kind: "AgentTurnFinished", params: { turnId: text } } as AnyEvent)
        handler?.({ kind: "SessionFinished", params: { sessionId, reason: "completed" } } as AnyEvent)
      })
    } as unknown as Client
    const chunks: string[] = []
    const output = { write: (chunk: string) => { chunks.push(chunk); return true } } as unknown as NodeJS.WritableStream

    await runCli(Readable.from(["first\n", "second\n"]), output, client)

    expect(client.createSession).toHaveBeenCalledOnce()
    expect(client.sendInput).toHaveBeenNthCalledWith(1, sessionId, "first")
    expect(client.sendInput).toHaveBeenNthCalledWith(2, sessionId, "second")
    expect(chunks.join(" ")).toContain("reply to second")
  })
})
