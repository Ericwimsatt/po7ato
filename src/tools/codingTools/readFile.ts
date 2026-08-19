import { readFile } from "node:fs/promises"
import { Effect } from "effect"
import { Tool } from "../tool.js"
import { MAX_FILE_BYTES, assertExistingWorkspacePath } from "../workspace.js"

type ReadParams = { path?: unknown }

export const readFileTool = new Tool(
  "read-file",
  "Read a UTF-8 text file within the workspace",
  (params, context) => Effect.tryPromise({
    try: async () => {
      const { target, info } = await assertExistingWorkspacePath(context.workspaceRoot, (params as ReadParams).path as string)
      if (!info.isFile()) throw new Error("path is not a file")
      if (info.size > MAX_FILE_BYTES) throw new Error(`file exceeds ${MAX_FILE_BYTES} byte limit`)
      return { path: (params as ReadParams).path, content: await readFile(target, "utf8") }
    },
    catch: error => String(error)
  }),
  params => typeof (params as ReadParams)?.path === "string" ? undefined : "invalid arguments: path must be a string"
)
