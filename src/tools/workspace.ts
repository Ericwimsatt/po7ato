import { access, lstat, realpath } from "node:fs/promises"
import path from "node:path"

export const MAX_FILE_BYTES = 1024 * 1024

export const workspacePath = (workspaceRoot: string, requestedPath: string): string => {
  if (typeof requestedPath !== "string" || requestedPath.length === 0) {
    throw new Error("path must be a non-empty relative path")
  }
  if (path.isAbsolute(requestedPath)) throw new Error("absolute paths are not allowed")

  const root = path.resolve(workspaceRoot || process.cwd())
  const target = path.resolve(root, requestedPath)
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("path is outside the workspace")
  }
  return target
}

export const assertExistingWorkspacePath = async (workspaceRoot: string, requestedPath: string) => {
  const target = workspacePath(workspaceRoot, requestedPath)
  await access(target)
  const [rootReal, targetReal] = await Promise.all([
    realpath(workspaceRoot || process.cwd()),
    realpath(target)
  ])
  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${path.sep}`)) {
    throw new Error("path resolves outside the workspace")
  }
  return { target: targetReal, info: await lstat(targetReal) }
}
