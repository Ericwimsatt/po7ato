import { createInterface } from "node:readline"
import { Effect } from "effect"
import { Client } from "./User.js"
import { eventBus, type AnyEvent } from "./orchestrator/eventBus/EventBus.js"

export type CliOptions = {
  verbose?: boolean
}

const formatDebugEvent = (event: AnyEvent): string => JSON.stringify({
  sequence: event.sequence,
  kind: event.kind,
  sessionId: event.sessionId,
  correlationId: event.correlationId,
  causationId: event.causationId,
  publisherId: event.publisherId,
  params: event.params
})

export async function runCli(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
  client = new Client(),
  options: CliOptions = {}
): Promise<void> {
  if (options.verbose) {
    // Keep diagnostics off stdout so model output remains pipeable.
    Effect.runFork(eventBus.subscribeAll(event => {
      process.stderr.write(`[bus] ${new Date(event.timestamp).toISOString()} ${formatDebugEvent(event)}\n`)
    }))
  }

  const interactive = input.isTTY === true
  const readline = createInterface({
    input,
    output: interactive ? output : undefined,
    prompt: interactive ? "po7ato> " : undefined
  })

  if (interactive) readline.prompt()

  let sessionId: Awaited<ReturnType<Client["createSession"]>> | undefined
  let resolveTurn: (() => void) | undefined
  let statusTimer: ReturnType<typeof setInterval> | undefined
  let statusStartedAt = 0

  const ensureSession = async (prompt: string) => {
    if (sessionId !== undefined) return sessionId

    sessionId = await client.createSession(prompt)
    client.subscribeToSession(sessionId, (event: AnyEvent) => {
      if (event.kind === "AgentTurnStarted") {
        statusStartedAt = Date.now()
        output.write("Po7ato: contacting model...\n")
        statusTimer = setInterval(() => {
          const elapsed = ((Date.now() - statusStartedAt) / 1000).toFixed(0)
          output.write(`Po7ato: still waiting (${elapsed}s)\n`)
        }, 5_000)
      }
      if (event.kind === "AgentOutputDelta") output.write(event.params.text)
      if (event.kind === "AgentTurnFinished") {
        if (statusTimer !== undefined) clearInterval(statusTimer)
        output.write(`\nPo7ato: model finished in ${((Date.now() - statusStartedAt) / 1000).toFixed(1)}s\n`)
      }
      if (event.kind === "AgentTurnFailed") {
        if (statusTimer !== undefined) clearInterval(statusTimer)
        output.write(`Po7ato error: ${event.params.error}\n`)
      }
      if (event.kind === "AgentTurnFinished" || event.kind === "AgentTurnFailed") {
        if (statusTimer !== undefined) clearInterval(statusTimer)
        resolveTurn?.()
        resolveTurn = undefined
      }
    })
    return sessionId
  }

  for await (const line of readline) {
    const prompt = String(line)
    if (prompt.length === 0) continue

    const currentSessionId = await ensureSession(prompt)
    const finished = new Promise<void>(resolve => { resolveTurn = resolve })
    client.sendInput(currentSessionId, prompt)
    await finished
    if (interactive) readline.prompt()
  }
  readline.close()
}
