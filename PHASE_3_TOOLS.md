# Phase 3 decisions

Phase 3 adds typed tool requests to the existing model boundary and keeps tool execution behind a small direct executor. A tool request has a stable `requestId`, a tool name, and unknown parameters; the registry validates parameters before calling a tool. Tool results are serialized as a `tool` conversation message so the continuation remains deterministic in tests.

The event bus remains the observable lifecycle: sessions publish `ToolRequested`, `ToolExecutionCompleted`, or `ToolExecutionFailed` around direct execution. This keeps the round trip visible without making unit tests depend on asynchronous event subscriptions.

The workspace scope is the session workspace (or the current working directory when no workspace is supplied). Read and search reject absolute paths and lexical escapes, verify existing targets resolve under the real workspace, ignore `.git`, `node_modules`, `dist`, and `.next`, and cap individual files at 1 MiB. Search is literal, UTF-8-oriented, deterministic by path order, and capped at 100 results.
