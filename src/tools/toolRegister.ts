import { Effect } from "effect"
import { eventBus, SessionBus } from "../orchestrator/eventBus/EventBus.js"
import { editFileTool } from "./codingTools/editFile.js"
import { requestUserInputTool } from "./codingTools/requestUserInput.js"
import { Tool } from "./tool.js"

/** Resolves and executes tools in response to ToolRequested events. */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>()

  init(): this {
    this.register(editFileTool)
    this.register(requestUserInputTool)

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
}

export const toolRegistry = new ToolRegistry().init()
