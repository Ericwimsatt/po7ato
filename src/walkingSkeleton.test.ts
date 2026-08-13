import { Effect } from "effect"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Client } from "./User.js"
import { Session } from "./Session.js"
import { EventBus } from "./orchestrator/eventBus/EventBus.js"
import { generatePublisherId } from "./publisherId.js"
import type { Model, ModelRequest } from "./model.js"

const tick = () => Effect.runPromise(Effect.sleep("10 millis"))

describe("Phase 1 walking skeleton", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("lets a Client attach after session creation succeeds", async () => {
    const bus = new EventBus()
    const client = new Client(bus)
    const publisher = generatePublisherId()
    const sessionId = "session-1" as never
    const received: string[] = []

    Effect.runFork(bus.subscribe("SessionCreateRequested", request => {
      Effect.runFork(bus.publish(
        { kind: "SessionCreateSuccessful", params: { sessionId } },
        publisher,
        { correlationId: request.correlationId, causationId: request.id }
      ))
    }))
    await tick()

    expect(await client.createSession("hello")).toBe(sessionId)
    client.subscribeToSession(sessionId, event => received.push(event.kind))
    await tick()
    await Effect.runPromise(bus.publish(
      { kind: "SessionStarted", params: { sessionId } },
      publisher,
      { sessionId }
    ).pipe(Effect.asVoid))
    await tick()

    expect(received).toEqual(["SessionStarted"])
  })

  it("starts once and keeps the session open across turns", async () => {
    const session = new Session("", generatePublisherId())
    const events: string[] = []
    Effect.runFork(session.bus.subscribeAll(event => events.push(event.kind)))
    session.init()
    await tick()
    await Effect.runPromise(session.bus.publish(
      { kind: "UserInputReceived", params: { text: "hello" } },
      generatePublisherId()
    ))
    await tick()

    expect(events).toEqual([
      "UserInputReceived",
      "AgentTurnStarted",
      "AgentOutputDelta",
      "AgentTurnFinished"
    ])
  })

  it("keeps a failed turn from finishing the session", async () => {
    const session = new Session("", generatePublisherId(), () => Effect.fail("deliberate failure"))
    const events: string[] = []
    Effect.runFork(session.bus.subscribeAll(event => events.push(event.kind)))
    session.init()
    await tick()
    await Effect.runPromise(session.bus.publish(
      { kind: "UserInputReceived", params: { text: "fail" } },
      generatePublisherId()
    ))
    await tick()

    expect(events).toEqual([
      "UserInputReceived",
      "AgentTurnStarted",
      "AgentTurnFailed"
    ])
  })

  it("keeps conversation history on the session across turns", async () => {
    const requests: ModelRequest[] = []
    const model: Model = {
      complete: request => {
        requests.push(request)
        return Effect.succeed({ kind: "completed" as const, text: `reply ${requests.length}` })
      }
    }
    const session = new Session("", generatePublisherId(), model)
    let turns = 0
    let resolveFirst: (() => void) | undefined
    const firstTurn = new Promise<void>(resolve => { resolveFirst = resolve })
    const secondTurn = new Promise<void>(resolve => {
      Effect.runFork(session.bus.subscribe("AgentTurnFinished", () => {
        turns += 1
        if (turns === 1) resolveFirst?.()
        if (turns === 2) resolve()
      }))
    })
    session.init()
    await tick()
    await Effect.runPromise(session.bus.publish(
      { kind: "UserInputReceived", params: { text: "first" } }, generatePublisherId()
    ))
    await firstTurn
    await Effect.runPromise(session.bus.publish(
      { kind: "UserInputReceived", params: { text: "second" } }, generatePublisherId()
    ))
    await secondTurn

    expect(requests[1]?.messages).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "reply 1" },
      { role: "user", content: "second" }
    ])
  })
})
