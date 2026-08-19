import { Effect } from "effect"
import { eventBus, SessionBus } from "../orchestrator/eventBus/EventBus.js"
import { editFileTool } from "./codingTools/editFile.js"
import { requestUserInputTool } from "./codingTools/requestUserInput.js"
import { readFileTool } from "./codingTools/readFile.js"
import { searchWorkspaceTool } from "./codingTools/searchWorkspace.js"
import { Tool } from "./tool.js"
import type { ToolContext } from "./tool.js"
import type { ToolRequest } from "../model.js"

/** Resolves and executes tools in response to ToolRequested events. */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>()

  init(): this {
    this.register(editFileTool)
    this.register(requestUserInputTool)
    this.register(readFileTool)
    this.register(searchWorkspaceTool)

    Effect.runFork(
      eventBus.subscribe("ToolRequested", event => {
        const tool = this.tools.get(event.params.toolName)

        if (tool === undefined || event.sessionId === undefined) {
          const error = tool === undefined
            ? `Unknown tool: ${event.params.toolName}`
            : "Tool requests must belong to a session"

          const options = event.sessionId === undefined
            ? { correlationId: event.correlationId, causationId: event.id }
            : {
                sessionId: event.sessionId,
                correlationId: event.correlationId,
                causationId: event.id
              }

          Effect.runFork(eventBus.publish(
            {
              kind: "ToolExecutionFailed",
              params: {
                requestId: event.params.requestId,
                toolName: event.params.toolName,
                error
              }
            },
            event.publisherId,
            options
          ).pipe(Effect.asVoid))
          return
        }

        const sessionBus = new SessionBus(event.sessionId, eventBus)
        const context = {
          sessionId: event.sessionId,
          requestId: event.params.requestId,
          workspaceRoot: process.cwd(),
          publisherId: event.publisherId,
          bus: sessionBus
        }

        Effect.runFork(
          tool.execute(event.params.params, context).pipe(
            Effect.flatMap(response => eventBus.publish(
              {
                kind: "ToolExecutionCompleted",
                params: {
                  requestId: event.params.requestId,
                  toolName: event.params.toolName,
                  response
                }
              },
              event.publisherId,
              {
                sessionId: event.sessionId,
                correlationId: event.correlationId,
                causationId: event.id
              }
            )),
            Effect.catchAll(error => eventBus.publish(
              {
                kind: "ToolExecutionFailed",
                params: {
                  requestId: event.params.requestId,
                  toolName: event.params.toolName,
                  error: String(error)
                }
              },
              event.publisherId,
              {
                sessionId: event.sessionId,
                correlationId: event.correlationId,
                causationId: event.id
              }
            )),
            Effect.asVoid
          )
        )
      })
    )
    return this
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  get(toolName: string): Tool | undefined {
    return this.tools.get(toolName)
  }

  execute(request: ToolRequest, context: ToolContext): Effect.Effect<unknown, unknown> {
    const tool = this.tools.get(request.toolName)
    if (tool === undefined) return Effect.fail(`Unknown tool: ${request.toolName}`)

    const validationError = tool.validate(request.params)
    if (validationError !== undefined) return Effect.fail(validationError)
    return tool.execute(request.params, context)
  }
}

export const toolRegistry = new ToolRegistry().init()
