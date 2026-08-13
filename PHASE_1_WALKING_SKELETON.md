# Phase 1 walking skeleton

## Behavior

The CLI accepts one non-empty line at a time. It uses the `Client` wrapper in
`src/User.ts` to request a session, waits for `SessionCreateSuccessful`, then
sends input using the returned session ID. The client receives session-scoped
events and the CLI prints `AgentOutputDelta` text.

The session owns the observable turn flow:

```text
UserInputReceived
  -> SessionStarted
  -> AgentTurnStarted
  -> AgentOutputDelta
  -> AgentTurnFinished
  -> SessionFinished
```

If the agent responder fails, the session emits `SessionFinished` with reason
`failed` and does not emit successful output or turn-finished events.

## Phase 1 decisions

- **Input surface:** a line-oriented CLI, implemented as an adapter over
  `Client`; no new dependency is required.
- **Client location:** `src/User.ts`, preserving the existing user/client
  convention.
- **Session setup:** `SessionCreateRequested` creates and initializes a
  session, then emits `SessionCreateSuccessful { sessionId }`. The client uses
  that ID to attach its session event subscription before sending input.
- **Lifecycle ownership:** `Session` publishes session start and finish events.
  The agent returns a response to the session, and the session publishes the
  output event to the session bus.
- **Failure behavior:** a failed responder produces a terminal failed session
  event. Persistence, retries, cancellation, and real model calls remain
  later milestones.

## Verification

```text
npm run test:run
npm run typecheck
npm run build
printf 'hello\n' | node dist/index.js
```

The manual command prints a canned response and exits successfully.
