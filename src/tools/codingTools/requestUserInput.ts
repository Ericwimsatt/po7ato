import { Effect } from "effect"
import { Tool } from "../tool.js"
import type { Question } from "../../orchestrator/eventBus/EventBus.js"

export const requestUserInputTool = new Tool(
  "request-user-input",
  "Request input from the user",
  (params, context) => {
    const questions = (params as { questions?: Question[] }).questions ?? []

    return context.bus.publish(
      {
        kind: "UserInputRequested",
        params: { requestId: context.requestId, questions }
      },
      context.publisherId
    ).pipe(Effect.as({ status: "waiting-for-user-input" }))
  }
)
