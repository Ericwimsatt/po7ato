# Product

<!-- impeccable:product-schema 1 -->

## Platform

cli

## Users

The primary user is the creator and maintainer of this project: a technical person experimenting with coding-agent architectures, models, tools, context management, and user interfaces.

Secondary users are technical developers who are comfortable forking the codebase, replacing units of the system, and changing implementation details directly. This is not currently aimed at non-technical end users.

## Product Purpose

Po7ato is an experimental coding-agent runtime designed to make radical changes to one part of an agent system safer and easier to reason about while the rest of the system remains understandable and usable.

Its immediate purpose is to provide peace of mind while hacking on unfamiliar code: a developer should be able to replace or reset a subsystem, run an experiment, inspect what happened, and recover without needing to understand the entire agent first.

Success means that experiments such as trying a new compaction algorithm, changing the model, operating on an isolated repository slice, adding file/log output, or connecting a different interface can be performed locally within a bounded subsystem and diagnosed from a durable record of system activity.

## Positioning

Po7ato is an event-recorded coding-agent runtime for developers who want to experiment with agent internals without making the whole system their mental model.

Its differentiating mechanism is not extensibility alone. The system treats a typed, durable event journal as the canonical record of accepted activity, then uses pub/sub delivery and projections to make that activity available to sessions, tools, logs, files, interfaces, and debugging workflows.

## Operating Context

The product is developed and operated directly from a code repository. The user is expected to read, fork, replace, and reset code while learning how the system works.

An agent session may involve a user request, model interaction, tool requests and responses, file changes, sub-agents, workspace or repository isolation, and output consumed by one or more interfaces. The runtime should make these interactions observable in one durable place and support replay or reconstruction when useful.

## Capabilities and Constraints

Confirmed capabilities and constraints:

- Components communicate through explicit, typed APIs and events.
- The system includes sessions, agents, model selection, tools, LLM adapters, and an event bus as distinct architectural areas.
- Components are intentionally replaceable, but everything may remain hard-coded while the architecture is being explored.
- A durable event journal is the source of truth for accepted events.
- Pub/sub is a delivery mechanism backed by the journal, not an independent source of truth.
- Events should be replayable so subscribers and projections can recover after failure or support new experiments.
- Logging, writing events to files, and broadcasting events to other consumers are first-class use cases.
- Per-session event streams and a central stream are both useful: session streams preserve local context, while the central stream supports cross-session observation.
- Git remains the primary mechanism for experimenting with and resetting implementation code; the event journal complements Git by recording runtime behavior.

Open decisions:

- The journal storage format and implementation are undecided.
- The durability and retention guarantees are undecided.
- The exact event envelope, sequence-number scope, correlation model, and schema-versioning policy are undecided.
- Replay, checkpoint, retry, idempotency, cancellation, and failure semantics are not yet specified.
- The first end-user interface is undecided.
- The initial isolation model for repository slices or workspaces is undecided.
- The first model provider and adapter contract are still experimental.

## Product Principles

- Optimize for safe experimentation, not abstract configurability.
- Make runtime behavior inspectable from a durable record.
- Keep boundaries explicit enough that a developer can change one subsystem without understanding every other subsystem.
- Prefer simple hard-coded compositions until a real experiment requires runtime configuration.
- Separate canonical facts from delivery, projections, and presentation.

## Evidence on Hand

The repository already contains early implementations or seams for an event bus, session handling, agents, model selection, tools, and LLM adapters. The current implementation is exploratory and should be treated as evidence of direction, not as a finalized architecture.

There is currently no confirmed product research, external customer evidence, performance benchmark, or end-user validation. Future work must not invent these.

## Accessibility & Inclusion

No product-specific accessibility requirements have been established yet. The first interface and its interaction model remain undecided.
