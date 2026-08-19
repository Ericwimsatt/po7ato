import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { Effect } from "effect"
import { Tool } from "../tool.js"
import { MAX_FILE_BYTES, workspacePath } from "../workspace.js"

const ignored = new Set([".git", "node_modules", "dist", ".next"])
const MAX_RESULTS = 100
type SearchParams = { query?: unknown; path?: unknown; maxResults?: unknown }

const filesUnder = async (root: string, relative = ""): Promise<string[]> => {
  const directory = path.join(root, relative)
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignored.has(entry.name)) continue
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(root, child))
    else if (entry.isFile()) files.push(child)
  }
  return files
}

export const searchWorkspaceTool = new Tool(
  "search-workspace",
  "Find literal text in UTF-8 files within the workspace",
  (params, context) => Effect.tryPromise({
    try: async () => {
      const input = params as SearchParams
      const query = input.query as string
      const relativeRoot = typeof input.path === "string" && input.path.length > 0 ? input.path : "."
      const maxResults = typeof input.maxResults === "number" && Number.isInteger(input.maxResults)
        ? Math.min(input.maxResults, MAX_RESULTS) : 50
      const root = workspacePath(context.workspaceRoot, relativeRoot)
      const results: { path: string; lineNumber: number; line: string }[] = []
      for (const relativeFile of await filesUnder(root)) {
        if (results.length >= maxResults) break
        const absolute = path.join(root, relativeFile)
        const content = await readFile(absolute)
        if (content.byteLength > MAX_FILE_BYTES || content.includes(0)) continue
        const lines = content.toString("utf8").split(/\r?\n/)
        lines.forEach((line, index) => {
          if (results.length < maxResults && line.includes(query)) {
            results.push({ path: path.relative(context.workspaceRoot || process.cwd(), absolute), lineNumber: index + 1, line })
          }
        })
      }
      return { query, results, truncated: results.length >= maxResults }
    },
    catch: error => String(error)
  }),
  params => {
    const input = params as SearchParams
    if (typeof input?.query !== "string" || input.query.length === 0) return "invalid arguments: query must be a non-empty string"
    if (input.query.length > 200) return "invalid arguments: query is too long"
    if (input.maxResults !== undefined && (!Number.isInteger(input.maxResults) || (input.maxResults as number) < 1)) return "invalid arguments: maxResults must be a positive integer"
    return undefined
  }
)
