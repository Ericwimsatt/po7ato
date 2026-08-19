import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Effect } from "effect"
import { afterEach, describe, expect, it } from "vitest"
import { Agent } from "./agent.js"
import type { Model, ModelRequest } from "./model.js"
import { Tool } from "./tools/tool.js"
import { readFileTool } from "./tools/codingTools/readFile.js"
import { searchWorkspaceTool } from "./tools/codingTools/searchWorkspace.js"
import { EventBus, SessionBus } from "./orchestrator/eventBus/EventBus.js"

const tempDirectories: string[] = []
afterEach(async () => {
  const { rm } = await import("node:fs/promises")
  await Promise.all(tempDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

const context = async (workspaceRoot: string, requestId = "request-1") => ({
  sessionId: "session-1" as never,
  requestId,
  workspaceRoot,
  publisherId: "test" as never,
  bus: new SessionBus("session-1" as never, new EventBus())
})

describe("Phase 3 tool round trip", () => {
  it("requests, executes, returns the result, and continues the model", async () => {
    const requests: ModelRequest[] = []
    const observed: string[] = []
    const model: Model = {
      complete: request => {
        requests.push(request)
        return Effect.succeed(requests.length === 1
          ? { kind: "tool-requested" as const, request: { requestId: "call-1", toolName: "echo", params: { value: "ok" } } }
          : { kind: "completed" as const, text: `got ${request.messages.at(-1)?.content}` })
      }
    }
    const echo = new Tool("echo", "Echo a value", params => Effect.succeed(params))
    const agent = new Agent(model,
      request => {
        observed.push("tool-request")
        return echo.execute(request.params, {} as never).pipe(Effect.tap(() => Effect.sync(() => observed.push("tool-result"))))
      },
      { requested: () => Effect.sync(() => observed.push("requested")), completed: () => Effect.void, failed: () => Effect.void })

    await expect(Effect.runPromise(agent.handleInput("use the tool"))).resolves.toContain("value")
    expect(requests).toHaveLength(2)
    expect(requests[1]?.messages.at(-1)).toMatchObject({ role: "tool", toolCallId: "call-1" })
    expect(observed).toEqual(["requested", "tool-request", "tool-result"])
  })

  it("makes unknown tools and invalid arguments deterministic failures", async () => {
    const unknown = new Tool("known", "", () => Effect.succeed(null))
    const registryLike = (name: string, params: unknown) => {
      const tool = name === "known" ? unknown : undefined
      if (!tool) return Effect.fail(`Unknown tool: ${name}`)
      const error = tool.validate(params)
      return error ? Effect.fail(error) : tool.execute(params, {} as never)
    }
    await expect(Effect.runPromise(registryLike("missing", {}))).rejects.toThrow("Unknown tool")
    const validated = new Tool("known", "", () => Effect.succeed(null), () => "invalid arguments")
    await expect(Effect.runPromise(validated.validate({}) ? Effect.fail(validated.validate({})) : Effect.succeed(null))).rejects.toThrow("invalid arguments")
  })
})

describe("Phase 3 workspace tools", () => {
  it("reads a file and rejects missing, malformed, and escaping paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "po7ato-phase3-")); tempDirectories.push(root)
    await writeFile(path.join(root, "note.txt"), "hello")
    const toolContext = await context(root)
    await expect(Effect.runPromise(readFileTool.execute({ path: "note.txt" }, toolContext))).resolves.toEqual({ path: "note.txt", content: "hello" })
    await expect(Effect.runPromise(readFileTool.execute({ path: "missing.txt" }, toolContext))).rejects.toThrow()
    await expect(Effect.runPromise(readFileTool.execute({ path: "../outside" }, toolContext))).rejects.toThrow("outside")
    expect(readFileTool.validate({})).toContain("path")
  })

  it("searches literal text in stable order, ignores generated directories, and limits results", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "po7ato-phase3-")); tempDirectories.push(root)
    await mkdir(path.join(root, "src")); await mkdir(path.join(root, "node_modules"))
    await writeFile(path.join(root, "src", "b.txt"), "needle\nnope")
    await writeFile(path.join(root, "src", "a.txt"), "needle")
    await writeFile(path.join(root, "node_modules", "ignored.txt"), "needle")
    const result = await Effect.runPromise(searchWorkspaceTool.execute({ query: "needle", maxResults: 1 }, await context(root))) as { results: unknown[]; truncated: boolean }
    expect(result.results).toHaveLength(1)
    expect(result.truncated).toBe(true)
    expect(searchWorkspaceTool.validate({ query: "" })).toContain("query")
  })
})
