# Architecture Plan

Po7ato is an event-recorded agent runtime. Components communicate by publishing typed events, and interested components subscribe to those events and react. The event bus announces what happened; it does not own the behavior that follows.

The event stream is the canonical record of accepted runtime activity. Pub/sub is the delivery mechanism over that record. This keeps activity observable, replayable, and available to multiple consumers such as sessions, tools, interfaces, logs, and debugging projections.

## Core boundaries

```text
CoreBus
  ├─ Event journal and replay
  ├─ Global event routing
  ├─ SessionManager
  ├─ ToolRegistry / ToolExecutor
  ├─ Settings and skill updates
  └─ Global observers

SessionRuntime
  ├─ SessionBus (scoped view of CoreBus)
  ├─ Agent execution loop
  ├─ Model adapter
  ├─ Conversation state
  ├─ Tool-call coordination
  └─ Subagent lifecycle
```

### Core bus

The core bus handles cross-session activity and provides the shared event infrastructure. It is responsible for publishing, persisting, routing, subscribing, and replaying events such as:

- session creation and closure
- global settings changes
- tool and skill registration changes
- cross-session notifications
- logging, metrics, and other projections

The core bus should not contain the agent loop, tool implementation, or session-specific business logic.

### Session bus

Each session has a session-scoped bus interface. It is a filtered view over the core bus, not a second independent source of truth. It exposes only events associated with its `sessionId` and adds that session identity when publishing.

The session bus carries:

- user input
- agent lifecycle events
- streamed model output
- tool requests and responses
- user-input requests and responses
- cancellation and errors
- subagent creation and completion
- agent-turn completion

The session bus and core bus can use the same event envelope and implementation. The difference is scope: the core bus sees everything, while the session bus presents one session's stream.

## Event-first communication

All communication uses the same event mechanism. A user message is an event just like a tool request or a session-close notification:

```text
UserInputReceived
        ↓
AgentTurnStarted
        ↓
AgentOutputDelta
        ↓
ToolRequested
        ↓
ToolExecutionCompleted
        ↓
AgentOutputDelta
        ↓
AgentTurnFinished
```

The bus does not need a separate implementation for commands. Some events represent observations (`UserInputReceived`, `ToolExecutionCompleted`), while others represent requests for work (`SessionCreateRequested`, `ToolRequested`). Their names communicate intent, but they share the same publishing and subscription model.

Subscribers should have clear ownership:

- `SessionManager` reacts to session lifecycle events.
- `SessionRuntime` reacts to user input, tool responses, cancellation, and relevant configuration changes.
- `ToolExecutor` reacts to `ToolRequested` and publishes completion or failure.
- Interfaces react to output and lifecycle events.
- The journal, logging, metrics, and debugging projections can observe all or selected events.

## SessionManager

`SessionHandler` should remain as a separate lifecycle service and can eventually be renamed `SessionManager`. It owns:

- creating sessions and their runtimes
- maintaining the `Map<SessionId, Session>` registry
- looking up sessions
- joining and leaving sessions
- disposing sessions and cleaning up resources
- enforcing lifecycle rules
- publishing session-created and session-closed events

The bus transports events; the session manager owns session lifecycle. Session creation may be triggered by a bus subscription, but the generic bus should not create sessions itself.

## Event envelope

Every event should use a common envelope. Most events should include a `sessionId`; global events may omit it.

```ts
type EventEnvelope<T> = {
  id: string
  kind: string
  params: T

  sessionId?: SessionId
  publisherId: PublisherId

  correlationId: string
  causationId?: string

  timestamp: number
  sequence: number
}
```

The fields have distinct purposes:

- `id`: identifies this exact event.
- `sessionId`: identifies the session involved.
- `publisherId`: identifies the component, user, or agent publishing it.
- `correlationId`: groups all events belonging to one larger interaction, such as one user request.
- `causationId`: identifies the specific prior event that directly caused this event.
- `sequence`: supports ordering, replay, and reconnecting consumers.
- `timestamp`: records when the event was accepted.

For example:

```text
UserInputReceived       id=101  correlationId=A
AgentTurnStarted        id=102  correlationId=A  causationId=101
ToolRequested           id=103  correlationId=A  causationId=102
ToolExecutionCompleted  id=104  correlationId=A  causationId=103
```

`correlationId` answers “which overall interaction is this part of?” `causationId` answers “which exact event directly led to this?”

## Tool execution

Tool events should contain stable data rather than live class instances:

```ts
type ToolRequested = {
  toolName: string
  requestId: string
  params: unknown
}
```

Tool requests should also carry `sessionId`, `correlationId`, and the originating agent-turn identity. The tool executor resolves `toolName` through the registry, validates the request, runs the tool, and publishes either `ToolExecutionCompleted` or `ToolExecutionFailed`. The session runtime resumes the agent when it receives the result.

User-input tools follow the same pattern: their request is associated with the originating session and tool-call `requestId`, and the eventual user response is published as a correlated event.

## Settings, tools, and skills

Changes to capabilities are global events, for example:

```text
SettingsChanged
ToolRegistered
ToolRemoved
SkillLoaded
SkillUnloaded
```

Session runtimes may subscribe to these events and update their available capabilities. For reproducibility, sessions should eventually record the tool, skill, and settings versions used during an interaction.

## Initial implementation direction

The first implementation can remain simple and in-process:

1. Keep one `EventBus` backed by the event journal/pub-sub implementation.
2. Add `sessionId` and correlation metadata to the event envelope.
3. Let `SessionManager` subscribe to session lifecycle events.
4. Let each `Session` expose a filtered `SessionBus` adapter.
5. Move agent execution into a `SessionRuntime` that reacts to session events.
6. Make tools publish completion or failure events instead of directly calling back into the agent.
7. Add persistence and replay behind the core bus without changing session subscribers.

This preserves replaceable boundaries while avoiding premature runtime configurability. The important invariant is that there is one canonical event stream and that all derived delivery paths can be reconstructed from it.

## Open decisions

The following remain intentionally unresolved:

- journal storage format and implementation
- retention and durability guarantees
- global versus per-session sequence numbers
- event schema versioning
- replay and checkpoint behavior
- retry and idempotency semantics
- cancellation and shutdown guarantees
- workspace and repository isolation
- model-provider and adapter contracts

