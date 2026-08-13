# Phase 2 model integration

## Behavior

Each session owns a model-backed agent. The agent sends the current user
message plus prior user/assistant exchanges through a small `Model` boundary.
The default runtime model is OpenRouter's `openrouter/free` route, while a
specific model can be selected with `OPENROUTER_MODEL`.

Model failures end the turn through the existing failed-session lifecycle.
Refusals and empty responses remain visible to the user as output rather than
being mistaken for successful substantive answers.

## Decisions

- **Provider:** OpenRouter, based on the existing repository configuration and
  adapter seam.
- **Development cost control:** `openrouter/free` is the default. A specific
  free model can be pinned with its OpenRouter `:free` model slug.
- **Credentials:** `OPENROUTER_KEY` is read from the process environment; no
  key is stored in the repository.
- **Model selection:** `OPENROUTER_MODEL` overrides the free router without
  changing code.
- **Request shape:** use OpenRouter's OpenAI-compatible chat-completions
  endpoint with non-streaming responses for this milestone.
- **History ownership:** `Agent` owns conversation history for one `Session`,
  so separate sessions cannot share messages.
- **Streaming:** OpenRouter SSE deltas are translated into ordered
  `AgentOutputDelta` events. The CLI displays each delta immediately, then
  prints the completed-turn marker after `AgentTurnFinished`.

The CLI supports `--verbose`, which prints each in-memory event envelope to
stderr while it is published. This is diagnostic output, not durable logging.

## Session lifecycle

`SessionStarted` is emitted once during session initialization. User messages
create agent turns but do not start or finish the session. The session owns its
`ModelMessage[]` history and appends a user/assistant pair only after a turn
completes. `SessionFinished` is reserved for the explicit `close()` path.

## Verification

Deterministic tests cover the model contract, multi-turn history, request
serialization, provider errors, refusal, empty output, and the existing Phase
1 lifecycle. The real provider check is opt-in:

```text
OPENROUTER_INTEGRATION=1 OPENROUTER_KEY=... npm run test:run
```
