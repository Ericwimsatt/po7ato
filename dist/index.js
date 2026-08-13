// src/SessionHandler.ts
import { Effect as Effect5 } from "effect";

// src/Session.ts
import { Effect as Effect3 } from "effect";

// src/agent.ts
import { Effect } from "effect";
var legacyResponderModel = (responder) => ({
  complete: (request) => responder(request.messages.at(-1)?.content ?? "").pipe(
    Effect.map((text) => ({ kind: "completed", text }))
  )
});
var responseText = (response) => {
  if (response.kind === "completed") return response.text || "[model returned no output]";
  if (response.kind === "refused") return `[model refused to answer: ${response.reason}]`;
  return "[model returned no output]";
};
var Agent = class {
  model;
  constructor(model = {
    complete: (request) => Effect.succeed({
      kind: "completed",
      text: `[stub agent response to: ${request.messages.at(-1)?.content ?? ""}]`
    })
  }) {
    this.model = typeof model === "function" ? legacyResponderModel(model) : model;
  }
  handleInput(text, history = []) {
    return this.handleInputStreaming(text, history, () => Effect.void);
  }
  handleInputStreaming(text, history, onDelta) {
    const userMessage = { role: "user", content: text };
    const messages = [...history, userMessage];
    const complete = this.model.stream === void 0 ? this.model.complete({ messages }).pipe(
      Effect.tap((response) => onDelta(responseText(response))),
      Effect.map(responseText)
    ) : this.model.stream({ messages }, onDelta).pipe(Effect.map(responseText));
    return complete;
  }
};

// src/orchestrator/eventBus/EventBus.ts
import { Effect as Effect2, PubSub, Stream } from "effect";
var newId = () => crypto.randomUUID();
var EventBus = class {
  pubsub;
  nextSequence = 0;
  constructor() {
    this.pubsub = Effect2.runSync(PubSub.unbounded());
  }
  subscribe(kind, handler) {
    return Stream.fromPubSub(this.pubsub).pipe(
      Stream.filter((event) => event.kind === kind),
      Stream.runForEach((event) => Effect2.sync(() => handler(event)))
    );
  }
  subscribeAll(handler) {
    return Stream.fromPubSub(this.pubsub).pipe(
      Stream.runForEach((event) => Effect2.sync(() => handler(event)))
    );
  }
  subscribeToSession(sessionId, handler) {
    return Stream.fromPubSub(this.pubsub).pipe(
      Stream.filter((event) => event.sessionId === sessionId),
      Stream.runForEach((event) => Effect2.sync(() => handler(event)))
    );
  }
  publish(event, publisherId, options = {}) {
    const envelope = {
      id: newId(),
      kind: event.kind,
      params: event.params,
      publisherId,
      correlationId: options.correlationId ?? newId(),
      timestamp: Date.now(),
      sequence: ++this.nextSequence,
      ...options.sessionId === void 0 ? {} : { sessionId: options.sessionId },
      ...options.causationId === void 0 ? {} : { causationId: options.causationId }
    };
    return PubSub.publish(this.pubsub, envelope).pipe(
      Effect2.as(envelope),
      Effect2.catchAllCause(
        (cause) => Effect2.sync(() => {
          console.error("EventBus publish failed:", cause);
          return envelope;
        })
      )
    );
  }
  publishAny(event) {
    return PubSub.publish(this.pubsub, event).pipe(Effect2.asVoid);
  }
};
var SessionBus = class {
  constructor(sessionId, coreBus) {
    this.sessionId = sessionId;
    this.coreBus = coreBus;
  }
  sessionId;
  coreBus;
  subscribe(kind, handler) {
    return this.coreBus.subscribe(kind, (event) => {
      if (event.sessionId === this.sessionId) handler(event);
    });
  }
  subscribeAll(handler) {
    return this.coreBus.subscribeToSession(this.sessionId, handler);
  }
  publish(event, publisherId, options = {}) {
    return this.coreBus.publish(event, publisherId, {
      ...options,
      sessionId: this.sessionId
    });
  }
};
var eventBus = new EventBus();

// src/sessionId.ts
import { Brand } from "effect";
function generateSessionId() {
  const uuid = crypto.randomUUID();
  const sessionId = Brand.nominal();
  return sessionId(uuid);
}

// src/Session.ts
var Session = class {
  constructor(workspaceRoot, creator, model) {
    this.workspaceRoot = workspaceRoot;
    this.creator = creator;
    void this.workspaceRoot;
    this.agent = new Agent(model);
  }
  workspaceRoot;
  creator;
  sessionId = generateSessionId();
  bus = new SessionBus(this.sessionId, eventBus);
  agent;
  history = [];
  init() {
    Effect3.runFork(this.bus.publish(
      { kind: "SessionStarted", params: { sessionId: this.sessionId } },
      this.creator
    ).pipe(Effect3.asVoid));
    Effect3.runFork(
      this.bus.subscribe("UserInputReceived", (event) => {
        Effect3.runFork(this.handleInput(event.params.text, event));
      })
    );
  }
  handleInput(text, inputEvent) {
    const turnId = crypto.randomUUID();
    const metadata = { correlationId: inputEvent.correlationId, causationId: inputEvent.id };
    return this.bus.publish(
      { kind: "AgentTurnStarted", params: { turnId } },
      this.creator,
      metadata
    ).pipe(
      Effect3.flatMap((turnStarted) => this.agent.handleInputStreaming(
        text,
        this.history,
        (delta) => this.bus.publish(
          { kind: "AgentOutputDelta", params: { turnId, text: delta } },
          this.creator,
          { correlationId: inputEvent.correlationId, causationId: turnStarted.id }
        ).pipe(Effect3.asVoid)
      ).pipe(
        Effect3.tap((response) => {
          this.history.push({ role: "user", content: text }, { role: "assistant", content: response });
        }),
        Effect3.flatMap((output) => this.bus.publish(
          { kind: "AgentTurnFinished", params: { turnId } },
          this.creator,
          { correlationId: inputEvent.correlationId, causationId: output.id }
        ).pipe(Effect3.asVoid))
      )),
      Effect3.catchAll((error) => this.bus.publish(
        {
          kind: "AgentTurnFailed",
          params: { turnId, error: String(error) }
        },
        this.creator,
        { correlationId: inputEvent.correlationId, causationId: inputEvent.id }
      ).pipe(Effect3.asVoid)),
      Effect3.asVoid
    );
  }
  close(reason) {
    return this.bus.publish(
      { kind: "SessionClosed", params: { reason } },
      this.creator
    ).pipe(
      Effect3.flatMap((closed) => this.bus.publish(
        { kind: "SessionFinished", params: { sessionId: this.sessionId, reason: "closed" } },
        this.creator,
        { causationId: closed.id }
      )),
      Effect3.asVoid
    );
  }
};

// src/llmAdapters/openRouter.tsx
import { Data, Effect as Effect4 } from "effect";

// src/modelSelector.ts
var modelSelector = () => process.env.OPENROUTER_MODEL ?? "openrouter/free";
var modelSelector_default = modelSelector;

// src/llmAdapters/openRouter.tsx
var endpoint = "https://openrouter.ai/api/v1/chat/completions";
var OpenRouterError = class extends Data.TaggedError("OpenRouterError") {
};
var parseResponse = (body) => {
  const choice = body.choices?.[0]?.message;
  if (typeof choice?.refusal === "string" && choice.refusal.length > 0) {
    return { kind: "refused", reason: choice.refusal };
  }
  if (typeof choice?.content !== "string" || choice.content.length === 0) {
    return { kind: "empty" };
  }
  return { kind: "completed", text: choice.content };
};
var createOpenRouterModel = (options = {}) => {
  const call = (messages, body, onResponse) => Effect4.tryPromise({
    try: async () => {
      const apiKey = options.apiKey ?? process.env.OPENROUTER_KEY;
      if (!apiKey) throw new OpenRouterError({ message: "OPENROUTER_KEY is not configured", cause: void 0 });
      const fetcher = options.fetcher ?? fetch;
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {},
          ...process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {}
        },
        body: JSON.stringify({
          model: options.model ?? modelSelector_default(),
          messages,
          ...body
        })
      });
      if (!response.ok) {
        const errorBody = await response.json();
        throw new OpenRouterError({
          message: typeof errorBody.error?.message === "string" ? errorBody.error.message : `OpenRouter request failed (${response.status})`,
          cause: errorBody.error
        });
      }
      return onResponse(response);
    },
    catch: (error) => error instanceof OpenRouterError ? error : new OpenRouterError({ message: String(error), cause: error })
  });
  return {
    complete: (requestBody) => call(requestBody.messages, { stream: false }, async (response) => parseResponse(await response.json())),
    stream: (requestBody, onDelta) => call(requestBody.messages, { stream: true }, async (response) => {
      if (response.body === null) throw new OpenRouterError({ message: "OpenRouter returned no response body", cause: void 0 });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      let refusal = "";
      const processLine = async (line) => {
        if (!line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (data === "[DONE]" || data.length === 0) return;
        const chunk = JSON.parse(data);
        const delta = chunk.choices?.[0]?.delta;
        if (typeof delta?.refusal === "string") refusal += delta.refusal;
        if (typeof delta?.content === "string" && delta.content.length > 0) {
          text += delta.content;
          await Effect4.runPromise(onDelta(delta.content));
        }
      };
      while (true) {
        const result = await reader.read();
        buffer += decoder.decode(result.value, { stream: !result.done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) await processLine(line.trimEnd());
        if (result.done) break;
      }
      if (buffer.length > 0) await processLine(buffer.trimEnd());
      if (refusal.length > 0) return { kind: "refused", reason: refusal };
      return text.length > 0 ? { kind: "completed", text } : { kind: "empty" };
    })
  };
};

// src/SessionHandler.ts
var SessionManager = class {
  sessions = /* @__PURE__ */ new Map();
  init() {
    Effect5.runFork(
      eventBus.subscribe("SessionCreateRequested", (event) => {
        const session = this.createSession(event.params.workspace ?? "", event.publisherId);
        Effect5.runFork(eventBus.publish(
          { kind: "SessionCreateSuccessful", params: { sessionId: session.sessionId } },
          event.publisherId,
          { correlationId: event.correlationId, causationId: event.id }
        ));
      })
    );
    return this;
  }
  get(sessionId) {
    return this.sessions.get(sessionId);
  }
  joinSession(sessionId, participant) {
    void participant;
    return this.sessions.get(sessionId);
  }
  createSession(workspaceRoot, creator) {
    const session = new Session(workspaceRoot, creator, createOpenRouterModel());
    session.init();
    this.sessions.set(session.sessionId, session);
    return session;
  }
};
var sessionManager = new SessionManager().init();

// src/tools/toolRegister.ts
import { Effect as Effect8 } from "effect";

// src/tools/codingTools/editFile.ts
import { Effect as Effect6 } from "effect";

// src/tools/tool.ts
var Tool = class {
  constructor(name, description, execute) {
    this.name = name;
    this.description = description;
    this.execute = execute;
  }
  name;
  description;
  execute;
};

// src/tools/codingTools/editFile.ts
var editFileTool = new Tool(
  "edit-file",
  "Edit a file in the project",
  (params, context) => Effect6.succeed({
    status: "stub",
    message: "File editing is not implemented yet.",
    params,
    sessionId: context.sessionId
  })
);

// src/tools/codingTools/requestUserInput.ts
import { Effect as Effect7 } from "effect";
var requestUserInputTool = new Tool(
  "request-user-input",
  "Request input from the user",
  (params, context) => {
    const questions = params.questions ?? [];
    return context.bus.publish(
      {
        kind: "UserInputRequested",
        params: { requestId: context.requestId, questions }
      },
      context.publisherId
    ).pipe(Effect7.as({ status: "waiting-for-user-input" }));
  }
);

// src/tools/toolRegister.ts
var ToolRegistry = class {
  tools = /* @__PURE__ */ new Map();
  init() {
    this.register(editFileTool);
    this.register(requestUserInputTool);
    Effect8.runFork(
      eventBus.subscribe("ToolRequested", (event) => {
        const tool = this.tools.get(event.params.toolName);
        if (tool === void 0 || event.sessionId === void 0) {
          const error = tool === void 0 ? `Unknown tool: ${event.params.toolName}` : "Tool requests must belong to a session";
          const options = event.sessionId === void 0 ? { correlationId: event.correlationId, causationId: event.id } : {
            sessionId: event.sessionId,
            correlationId: event.correlationId,
            causationId: event.id
          };
          Effect8.runFork(eventBus.publish(
            {
              kind: "ToolExecutionFailed",
              params: {
                requestId: event.params.requestId,
                toolName: event.params.toolName,
                error
              }
            },
            event.publisherId,
            options
          ).pipe(Effect8.asVoid));
          return;
        }
        const sessionBus = new SessionBus(event.sessionId, eventBus);
        const context = {
          sessionId: event.sessionId,
          requestId: event.params.requestId,
          publisherId: event.publisherId,
          bus: sessionBus
        };
        Effect8.runFork(
          tool.execute(event.params.params, context).pipe(
            Effect8.flatMap((response) => eventBus.publish(
              {
                kind: "ToolExecutionCompleted",
                params: {
                  requestId: event.params.requestId,
                  toolName: event.params.toolName,
                  response
                }
              },
              event.publisherId,
              {
                sessionId: event.sessionId,
                correlationId: event.correlationId,
                causationId: event.id
              }
            )),
            Effect8.catchAll((error) => eventBus.publish(
              {
                kind: "ToolExecutionFailed",
                params: {
                  requestId: event.params.requestId,
                  toolName: event.params.toolName,
                  error: String(error)
                }
              },
              event.publisherId,
              {
                sessionId: event.sessionId,
                correlationId: event.correlationId,
                causationId: event.id
              }
            )),
            Effect8.asVoid
          )
        );
      })
    );
    return this;
  }
  register(tool) {
    this.tools.set(tool.name, tool);
  }
  get(toolName) {
    return this.tools.get(toolName);
  }
};
var toolRegistry = new ToolRegistry().init();

// src/cli.ts
import { createInterface } from "readline";
import { Effect as Effect10 } from "effect";

// src/User.ts
import { Effect as Effect9 } from "effect";

// src/publisherId.ts
import { Brand as Brand2 } from "effect";
function generatePublisherId() {
  const uuid = crypto.randomUUID();
  const publisherId = Brand2.nominal();
  return publisherId(uuid);
}

// src/User.ts
var Client = class {
  constructor(coreBus = eventBus, publisherId = generatePublisherId()) {
    this.coreBus = coreBus;
    this.publisherId = publisherId;
    Effect9.runFork(this.coreBus.subscribeAll((event) => {
      if (event.sessionId !== void 0) {
        Effect9.runFork(this.events.publishAny(event));
      }
      if (event.kind === "SessionCreateSuccessful") {
        this.pending.get(event.correlationId)?.(event.params.sessionId);
        this.pending.delete(event.correlationId);
      }
    }));
  }
  coreBus;
  publisherId;
  events = new EventBus();
  pending = /* @__PURE__ */ new Map();
  createSession(prompt, workspace = "") {
    const correlationId = crypto.randomUUID();
    const created = new Promise((resolve) => this.pending.set(correlationId, resolve));
    Effect9.runFork(this.coreBus.publish(
      { kind: "SessionCreateRequested", params: { prompt, mode: "ask", workspace } },
      this.publisherId,
      { correlationId }
    ));
    return created;
  }
  sendInput(sessionId, text) {
    Effect9.runFork(this.coreBus.publish(
      { kind: "UserInputReceived", params: { text } },
      this.publisherId,
      { sessionId }
    ));
  }
  subscribeToSession(sessionId, handler) {
    Effect9.runFork(this.events.subscribeToSession(sessionId, handler));
  }
};

// src/cli.ts
var formatDebugEvent = (event) => JSON.stringify({
  sequence: event.sequence,
  kind: event.kind,
  sessionId: event.sessionId,
  correlationId: event.correlationId,
  causationId: event.causationId,
  publisherId: event.publisherId,
  params: event.params
});
async function runCli(input = process.stdin, output = process.stdout, client = new Client(), options = {}) {
  if (options.verbose) {
    Effect10.runFork(eventBus.subscribeAll((event) => {
      process.stderr.write(`[bus] ${new Date(event.timestamp).toISOString()} ${formatDebugEvent(event)}
`);
    }));
  }
  const interactive = input.isTTY === true;
  const readline = createInterface({
    input,
    output: interactive ? output : void 0,
    prompt: interactive ? "po7ato> " : void 0
  });
  if (interactive) readline.prompt();
  let sessionId;
  let resolveTurn;
  let statusTimer;
  let statusStartedAt = 0;
  const ensureSession = async (prompt) => {
    if (sessionId !== void 0) return sessionId;
    sessionId = await client.createSession(prompt);
    client.subscribeToSession(sessionId, (event) => {
      if (event.kind === "AgentTurnStarted") {
        statusStartedAt = Date.now();
        output.write("Po7ato: contacting model...\n");
        statusTimer = setInterval(() => {
          const elapsed = ((Date.now() - statusStartedAt) / 1e3).toFixed(0);
          output.write(`Po7ato: still waiting (${elapsed}s)
`);
        }, 5e3);
      }
      if (event.kind === "AgentOutputDelta") output.write(event.params.text);
      if (event.kind === "AgentTurnFinished") {
        if (statusTimer !== void 0) clearInterval(statusTimer);
        output.write(`
Po7ato: model finished in ${((Date.now() - statusStartedAt) / 1e3).toFixed(1)}s
`);
      }
      if (event.kind === "AgentTurnFailed") {
        if (statusTimer !== void 0) clearInterval(statusTimer);
        output.write(`Po7ato error: ${event.params.error}
`);
      }
      if (event.kind === "AgentTurnFinished" || event.kind === "AgentTurnFailed") {
        if (statusTimer !== void 0) clearInterval(statusTimer);
        resolveTurn?.();
        resolveTurn = void 0;
      }
    });
    return sessionId;
  };
  for await (const line of readline) {
    const prompt = String(line);
    if (prompt.length === 0) continue;
    const currentSessionId = await ensureSession(prompt);
    const finished = new Promise((resolve) => {
      resolveTurn = resolve;
    });
    client.sendInput(currentSessionId, prompt);
    await finished;
    if (interactive) readline.prompt();
  }
  readline.close();
}

// src/index.ts
if (process.stdin.isTTY) {
  console.error("Po7ato CLI: enter a request, one per line. Press Ctrl-D to exit.");
}
await runCli(void 0, void 0, void 0, { verbose: process.argv.includes("--verbose") });
