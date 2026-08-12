// src/index.ts
import { Effect as Effect8, Console } from "effect";

// src/SessionHandler.ts
import { Effect as Effect4 } from "effect";

// src/Session.ts
import { Effect as Effect3 } from "effect";

// src/agent.ts
import { Effect } from "effect";
var Agent = class {
  constructor(sessionId, publisherId, workspaceRoot, bus) {
    this.sessionId = sessionId;
    this.publisherId = publisherId;
    this.workspaceRoot = workspaceRoot;
    this.bus = bus;
  }
  sessionId;
  publisherId;
  workspaceRoot;
  bus;
  handleInput(text, inputEvent) {
    const turnId = crypto.randomUUID();
    const metadata = {
      correlationId: inputEvent.correlationId,
      causationId: inputEvent.id
    };
    return this.bus.publish(
      { kind: "AgentTurnStarted", params: { turnId } },
      this.publisherId,
      metadata
    ).pipe(
      Effect.flatMap((started) => this.bus.publish(
        {
          kind: "AgentOutputDelta",
          params: { turnId, text: `[stub agent response to: ${text}]` }
        },
        this.publisherId,
        { correlationId: inputEvent.correlationId, causationId: started.id }
      )),
      Effect.flatMap((output) => this.bus.publish(
        { kind: "AgentTurnFinished", params: { turnId } },
        this.publisherId,
        { correlationId: inputEvent.correlationId, causationId: output.id }
      )),
      Effect.asVoid
    );
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
  constructor(workspaceRoot, creator) {
    this.workspaceRoot = workspaceRoot;
    this.creator = creator;
    this.agent = new Agent(this.sessionId, creator, workspaceRoot, this.bus);
  }
  workspaceRoot;
  creator;
  sessionId = generateSessionId();
  bus = new SessionBus(this.sessionId, eventBus);
  agent;
  init() {
    Effect3.runFork(
      this.bus.subscribe("UserInputReceived", (event) => {
        Effect3.runFork(this.agent.handleInput(event.params.text, event));
      })
    );
  }
  close(reason) {
    return this.bus.publish(
      { kind: "SessionClosed", params: { reason } },
      this.creator
    ).pipe(Effect3.asVoid);
  }
};

// src/SessionHandler.ts
var SessionManager = class {
  sessions = /* @__PURE__ */ new Map();
  init() {
    Effect4.runFork(
      eventBus.subscribe("SessionCreateRequested", (event) => {
        const session = this.createSession(event.params.workspace ?? "", event.publisherId);
        Effect4.runFork(
          eventBus.publish(
            {
              kind: "SessionCreated",
              params: { requester: event.publisherId }
            },
            event.publisherId,
            {
              sessionId: session.sessionId,
              correlationId: event.correlationId,
              causationId: event.id
            }
          ).pipe(
            Effect4.flatMap((created) => eventBus.publish(
              {
                kind: "UserInputReceived",
                params: { text: event.params.prompt }
              },
              event.publisherId,
              {
                sessionId: session.sessionId,
                correlationId: event.correlationId,
                causationId: created.id
              }
            )),
            Effect4.asVoid
          )
        );
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
    const session = new Session(workspaceRoot, creator);
    session.init();
    this.sessions.set(session.sessionId, session);
    return session;
  }
};
var sessionManager = new SessionManager().init();

// src/tools/toolRegister.ts
import { Effect as Effect7 } from "effect";

// src/tools/codingTools/editFile.ts
import { Effect as Effect5 } from "effect";

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
  (params, context) => Effect5.succeed({
    status: "stub",
    message: "File editing is not implemented yet.",
    params,
    sessionId: context.sessionId
  })
);

// src/tools/codingTools/requestUserInput.ts
import { Effect as Effect6 } from "effect";
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
    ).pipe(Effect6.as({ status: "waiting-for-user-input" }));
  }
);

// src/tools/toolRegister.ts
var ToolRegistry = class {
  tools = /* @__PURE__ */ new Map();
  init() {
    this.register(editFileTool);
    this.register(requestUserInputTool);
    Effect7.runFork(
      eventBus.subscribe("ToolRequested", (event) => {
        const tool = this.tools.get(event.params.toolName);
        if (tool === void 0 || event.sessionId === void 0) {
          const error = tool === void 0 ? `Unknown tool: ${event.params.toolName}` : "Tool requests must belong to a session";
          const options = event.sessionId === void 0 ? { correlationId: event.correlationId, causationId: event.id } : {
            sessionId: event.sessionId,
            correlationId: event.correlationId,
            causationId: event.id
          };
          Effect7.runFork(eventBus.publish(
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
          ).pipe(Effect7.asVoid));
          return;
        }
        const sessionBus = new SessionBus(event.sessionId, eventBus);
        const context = {
          sessionId: event.sessionId,
          requestId: event.params.requestId,
          publisherId: event.publisherId,
          bus: sessionBus
        };
        Effect7.runFork(
          tool.execute(event.params.params, context).pipe(
            Effect7.flatMap((response) => eventBus.publish(
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
            Effect7.catchAll((error) => eventBus.publish(
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
            Effect7.asVoid
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

// src/index.ts
var program = Console.log("Hello, World!");
Effect8.runSync(program);
