# Coding Agent Implementation Order

This document is a learning-oriented build order for Po7ato. It describes **what capability to add next and how to prove that it works**, without choosing architecture, libraries, protocols, storage formats, model providers, interfaces, or safety policies in advance.

The goal is to keep the agent runnable at every milestone. Each milestone should be small enough to understand, test, commit, and replace independently.

## How to use this plan

For every milestone:

1. Write down the behavior you want in one or two sentences.
2. Decide only the technical details needed for that milestone.
3. Add an automated test before or alongside the implementation.
4. Add one small end-to-end demonstration when appropriate.
5. Record the decisions you made and why.
6. Commit the working milestone before continuing.

Do not make a subsystem generic merely because a later milestone might need it. A hard-coded implementation is acceptable until a test or experiment demonstrates a reason to change it.

### Milestone completion rule

A milestone is complete when:

- its new behavior is observable;
- its automated tests pass repeatedly;
- failures are understandable from the output or activity record;
- the previous milestones still pass; and
- you can explain the new execution path from input to result.

Keep real network calls, credentials, timing, and model variability out of the main test suite. Test doubles can make the normal suite deterministic; a separate opt-in test can verify a real integration.

## Phase 0: Establish a repeatable baseline

### 0.1 Capture the current behavior

**Build:** Nothing new. Run the current program and write down what it does, what inputs it accepts, and where it fails.

**Test:** Add the smallest smoke test that starts the current entry point or exercises the current top-level behavior.

**Done when:** You have a known starting point and one command that reports whether the repository is healthy.

**Decide while doing it:** What counts as the minimum supported local development environment?

### 0.2 Create the development feedback loop

**Build:** Define the commands used for fast tests, full tests, static checks, and a manual run.

**Test:** Intentionally introduce a temporary failure and confirm each relevant command detects it; then revert the temporary failure.

**Done when:** A future change can be checked without remembering a collection of manual steps.

**Decide while doing it:** Which checks are fast enough to run after every edit, and which belong in a slower verification pass?

## Phase 1: Build a walking skeleton

### 1.1 Accept one user request and return a canned answer

**Build:** Connect the chosen input surface to a minimal session or request handler and return a fixed response. Do not call a model yet.

**Test:** Given a user message, the program returns the expected canned answer and associates the result with the same interaction.

**Done when:** You can trace one complete request through the running program without any external dependency.

**Decide while doing it:** What is the first input/output surface, and what is the minimum lifecycle of one interaction?

### 1.2 Record the observable lifecycle of that request

**Build:** Make the important facts of the request visible: input accepted, work started, output produced, and work finished or failed. This can remain in memory initially.

**Test:** Assert the facts appear in the expected order for both a successful request and a deliberately failed request.

**Done when:** A test can explain what happened without inspecting private implementation state.

**Decide while doing it:** Which occurrences are meaningful facts worth recording, and what identity is needed to relate them?

## Phase 2: Introduce a model behind a controllable boundary

### 2.1 Use a deterministic fake model

**Build:** Replace the canned answer with a model-shaped dependency that is fully controlled by the test.

**Test:** Verify the request sent to the fake and the response shown to the user. Cover success, refusal or empty output, and failure.

**Done when:** The full request path behaves like a model-backed agent without requiring network access.

**Decide while doing it:** What is the smallest model capability the runtime needs today?

### 2.2 Make one real single-turn model call

**Build:** Add one real model connection and send a single user message through it. Keep this path as small as possible.

**Test:** Keep deterministic tests against the fake. Add an opt-in integration test that checks only stable properties, such as receiving a non-empty valid response.

**Done when:** A real prompt produces a visible answer, and an integration failure is distinguishable from an agent failure.

**Decide while doing it:** Provider, model, credentials handling, request limits, and the minimum response data to preserve.

### 2.3 Add multi-turn conversation

**Build:** Allow a second user message to depend on the first exchange.

**Test:** Use a fake model that asserts it received the required prior conversation. Also prove that two sessions do not share conversation state.

**Done when:** Follow-up questions work and session boundaries are visible in tests.

**Decide while doing it:** What belongs in conversation history, and who owns that history?

### 2.4 Add incremental output if it is useful

**Build:** Surface model output as it arrives while still producing a definite final result.

**Test:** Verify ordered chunks, final assembly, failure partway through output, and cancellation partway through output.

**Done when:** Partial output cannot be mistaken for a completed turn.

**Decide while doing it:** Whether incremental output is required now, and how partial and final output are represented.

## Phase 3: Teach the agent to request actions

### 3.1 Complete one tool round trip with a fake tool

**Build:** Let a fake model request a harmless deterministic action, execute it, return its result to the model, and produce a final answer.

**Test:** Assert the complete order: model request, tool request, tool result, model continuation, final answer. Also cover an unknown tool and invalid arguments.

**Done when:** Tool use is an observable round trip rather than a hidden function call.

**Decide while doing it:** Tool request/result shape, validation responsibility, tool identity, and how a result is correlated with its request.

### 3.2 Add a read-only workspace tool

**Build:** Give the agent one narrowly scoped way to inspect the workspace, such as reading a known file or listing known paths.

**Test:** Cover a successful read, a missing target, an invalid request, and an attempt outside the allowed scope.

**Done when:** The agent can answer a question using workspace evidence without changing the workspace.

**Decide while doing it:** Allowed scope, path handling, size limits, encoding behavior, and how tool output is presented to the model.

### 3.3 Add workspace search

**Build:** Let the agent locate relevant files or text without already knowing the exact target.

**Test:** Use a fixed fixture workspace and verify matches, no matches, ignored content, malformed queries, and output limits.

**Done when:** The agent can discover evidence before reading it in detail.

**Decide while doing it:** Search semantics, ignored paths, ordering, limits, and result format.

## Phase 4: Allow controlled changes

### 4.1 Add one file-editing operation

**Build:** Allow a narrowly defined edit in a disposable fixture workspace before trying it on the project itself.

**Test:** Cover a successful edit, a stale or mismatched target, an invalid path, no-op behavior, and preservation of unrelated content.

**Done when:** Every edit has a clear before/after result and cannot silently target the wrong content.

**Decide while doing it:** Edit semantics, allowed scope, conflict behavior, backup or recovery expectations, and size limits.

### 4.2 Let the agent verify its change

**Build:** Give the agent a bounded way to run a verification action and observe its output.

**Test:** Cover success, non-zero failure, timeout, excessive output, missing executable, and disallowed execution.

**Done when:** The agent can distinguish “I made a change” from “I made a change that passes its check.”

**Decide while doing it:** Execution boundary, approval policy, timeout, environment, output limits, and allowed commands.

### 4.3 Add a minimal iterative agent loop

**Build:** Allow repeated model/action/result cycles until the model finishes or a limit is reached.

**Test:** Cover zero tools, one tool, several tools, a tool failure, repeated identical requests, and reaching the configured limit.

**Done when:** The agent can inspect, edit, verify, and summarize one tiny task without bespoke orchestration for that task.

**Decide while doing it:** Completion signal, iteration limits, repeated-action handling, and which failures should stop or continue a turn.

## Phase 5: Add human control and safe interruption

### 5.1 Request user input during a turn

**Build:** Pause a running turn for an answer and then resume the correct pending work.

**Test:** Cover one pending question, multiple sessions with pending questions, an invalid or late response, and cancellation while waiting.

**Done when:** A response cannot accidentally resume the wrong session, turn, or request.

**Decide while doing it:** When questions are allowed, how pending work is identified, and how long it may remain pending.

### 5.2 Add approval for consequential actions

**Build:** Require an explicit decision before at least one selected class of action.

**Test:** Cover allow once, deny, cancellation, and an attempted bypass of the approval boundary.

**Done when:** The protected action cannot execute before approval is recorded.

**Decide while doing it:** What requires approval, the scope and lifetime of approval, and whether policies can vary by session.

### 5.3 Add cancellation and clean shutdown

**Build:** Allow the user to stop model work, tool work, waiting for input, and the whole session where feasible.

**Test:** Cancel at each lifecycle stage and verify no later success is reported. Confirm resources and pending work are cleaned up.

**Done when:** Stopping work has an observable, terminal outcome.

**Decide while doing it:** Cancellation guarantees, cleanup ownership, and what happens when underlying work cannot stop immediately.

## Phase 6: Make sessions durable and explainable

### 6.1 Support explicit session lifecycle

**Build:** Create, identify, resume, close, and reject use of a closed session.

**Test:** Cover independent sessions, lookup, close, duplicate requests, and cleanup after failure.

**Done when:** Session ownership and state do not depend on accidental process-local behavior.

**Decide while doing it:** Session identity, lifecycle rules, retention, and what “resume” promises.

### 6.2 Persist the accepted activity record

**Build:** Preserve enough activity to inspect a completed or failed run after the process exits.

**Test:** Restart the process and verify the prior record remains ordered, attributable, and readable. Simulate an interrupted write or damaged record.

**Done when:** The durable record can answer what the agent attempted and what actually completed.

**Decide while doing it:** Storage, durability boundary, ordering, schema evolution, retention, and treatment of sensitive data.

### 6.3 Replay and rebuild one derived view

**Build:** Reconstruct one useful view, such as a transcript or session summary, only from the recorded activity.

**Test:** Compare live and replayed results, repeat replay, start replay from a partial point, and handle an unknown record version.

**Done when:** Deleting and rebuilding the derived view does not lose canonical activity.

**Decide while doing it:** Replay scope, checkpoints, idempotency, compatibility, and recovery behavior.

## Phase 7: Manage bounded context

### 7.1 Measure what is sent to the model

**Build:** Expose the contents and approximate size of each model request in a safe diagnostic form.

**Test:** Verify that adding conversation, tool results, and instructions changes the measurement as expected.

**Done when:** Context growth is visible before any compaction strategy is introduced.

**Decide while doing it:** Measurement method, diagnostic detail, and handling of secrets or large content.

### 7.2 Enforce a context budget

**Build:** Prevent an oversized request from being sent without a deliberate reduction or explicit failure.

**Test:** Cover just under, exactly at, and over the limit; include a single item too large to fit.

**Done when:** Context overflow is deterministic and understandable.

**Decide while doing it:** Budget source, reserved capacity, prioritization, and failure behavior.

### 7.3 Add one compaction experiment

**Build:** Introduce one replaceable way to reduce old context while retaining enough information for a chosen test task.

**Test:** Run the same long scripted conversation before and after compaction. Check size reduction, retained facts, tool continuity, and replay diagnostics.

**Done when:** The experiment has measurable benefits and known losses, even if the strategy is temporary.

**Decide while doing it:** Compaction trigger, retained information, summarization method, auditability, and reversibility.

## Phase 8: Exercise replaceable boundaries

### 8.1 Add a second model implementation

**Build:** Run the same small agent scenario through a second model implementation without changing the scenario itself.

**Test:** Use shared behavioral tests plus separate opt-in integration checks for each real model connection.

**Done when:** Differences are isolated and visible rather than spread through the agent loop.

**Decide while doing it:** The genuinely shared behavior, provider-specific capabilities, normalization rules, and feature negotiation.

### 8.2 Add a second consumer of agent activity

**Build:** Present or export the same activity through another consumer, such as a log, file, or alternate interface.

**Test:** Feed a fixed recorded session to both consumers and verify each produces its intended result without changing canonical activity.

**Done when:** Agent execution does not depend on one presentation surface.

**Decide while doing it:** Consumer responsibilities, reconnect behavior, incremental updates, and accessibility expectations.

## Phase 9: Add advanced agent behavior only when needed

### 9.1 Add workspace isolation

**Build:** Run an edit task in an isolated disposable workspace and deliberately accept or discard its result.

**Test:** Verify changes do not escape the workspace, concurrent work does not collide, and cleanup works after success, failure, and cancellation.

**Done when:** An experiment can fail without damaging the source workspace.

**Decide while doing it:** Isolation mechanism, setup cost, synchronization, cleanup, and how results are reviewed or adopted.

### 9.2 Add one sub-agent round trip

**Build:** Let a parent delegate a bounded read-only task, receive a result, and incorporate it into the parent’s answer.

**Test:** Cover success, child failure, cancellation, timeout, unrelated concurrent sessions, and correct attribution in the activity record.

**Done when:** Delegated work has explicit input, output, ownership, and lifecycle.

**Decide while doing it:** Delegation authority, context inheritance, tool access, concurrency, budget, cancellation, and result format.

### 9.3 Add concurrent work

**Build:** Execute two independent tasks at the same time only after their isolated single-task behavior is reliable.

**Test:** Force different completion orders, partial failure, cancellation, resource limits, and conflicting proposed changes.

**Done when:** Results are deterministic where required and nondeterministic ordering cannot corrupt state.

**Decide while doing it:** Scheduling, limits, shared resources, conflict handling, and ordering guarantees.

## Phase 10: Turn examples into an evaluation suite

### 10.1 Collect representative tasks

**Build:** Save small tasks that exercise answering, searching, editing, verifying, asking for input, recovering from errors, and respecting boundaries.

**Test:** Each task gets an explicit success rubric based on observable results, not exact model wording.

**Done when:** A change to one subsystem can be evaluated against the same tasks as the previous version.

**Decide while doing it:** Task selection, stable fixtures, grading method, and which failures matter most.

### 10.2 Measure behavior over repeated runs

**Build:** Run nondeterministic scenarios enough times to see success rate, failure categories, cost, and duration.

**Test:** Verify the evaluator itself with known passing and failing fixtures.

**Done when:** “This change is better” can be supported by evidence rather than one impressive run.

**Decide while doing it:** Sample size, acceptable thresholds, recorded metrics, and comparison method.

### 10.3 Harden one failure mode at a time

**Build:** Choose the most frequent or costly observed failure, add a reproducing test, fix it, and rerun the suite.

**Test:** Keep every reproducer as a regression test where practical.

**Done when:** Reliability work is driven by observed failures and does not obscure which change helped.

**Decide while doing it:** Failure priority, retry policy, fallback behavior, and acceptable degradation.

## Suggested first complete learning slice

Before adding advanced features, aim to complete this narrow end-to-end slice:

1. A user submits one tiny coding task.
2. The model asks to inspect a fixture workspace.
3. A read-only tool returns evidence.
4. The model requests one controlled edit.
5. The model requests one verification action.
6. The agent reports the result.
7. The activity record shows every accepted step and any failure.

Build that slice with fake model responses first. Then run the same slice with a real model. This proves the core learning loop without requiring persistence, compaction, sub-agents, multiple interfaces, or runtime configurability.

## Features intentionally deferred

Do not add these merely because a mature coding agent might have them:

- multiple model providers;
- dynamic plugin or tool loading;
- sub-agents or concurrency;
- context compaction;
- elaborate configuration;
- a graphical interface;
- distributed execution;
- performance optimization; or
- generalized abstractions for hypothetical consumers.

Introduce one only when the preceding milestones are stable and the next experiment specifically needs it.

## Decision log template

Use this short template when a milestone requires a choice:

```md
## Decision: <short name>

- Milestone:
- Problem encountered:
- Constraints observed:
- Options tried or considered:
- Choice for now:
- Evidence/tests:
- What would make us revisit it:
```

“Choice for now” is intentional. The purpose of Po7ato is to make experiments understandable and replaceable, not to predict the final design before the experiments exist.
