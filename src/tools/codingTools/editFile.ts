import { Effect } from "effect"
import { Tool } from "../tool.js"

export const editFileTool = new Tool(
  "edit-file",
  "Edit a file in the project",
  (params, context) => Effect.succeed({
    status: "stub",
    message: "File editing is not implemented yet.",
    params,
    sessionId: context.sessionId
  })
)
