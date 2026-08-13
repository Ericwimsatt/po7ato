import { Effect, PubSub, Stream } from "effect"
import type { PublisherId } from "../../publisherId.js"
import type { SessionId } from "../../sessionId.js"

export type AgentMode = "build" | "plan" | "ask"

export type Question = {
  question: string
  suggestedAnswers: { answer: string }[]
}

/** Event payloads are facts or requests, but share one transport. */
export type EventMap = {
  SessionCreateRequested: {
    prompt: string
    mode: AgentMode
    workspace?: string
  }
  SessionCreateSuccessful: { sessionId: SessionId }
  SessionStarted: { sessionId: SessionId }
  SessionFinished: { sessionId: SessionId; reason: "closed"; error?: string }
  SessionClosed: { reason: string }
  UserInputReceived: { text: string }
  AgentTurnStarted: { turnId: string }
  AgentOutputDelta: { turnId: string; text: string }
  AgentTurnFinished: { turnId: string }
  AgentTurnFailed: { turnId: string; error: string }
  ToolRequested: {
    requestId: string
    turnId: string
    toolName: string
    params: unknown
  }
  ToolExecutionCompleted: {
    requestId: string
    toolName: string
    response: unknown
  }
  ToolExecutionFailed: {
    requestId: string
    toolName: string
    error: string
  }
  UserInputRequested: { requestId: string; questions: Question[] }
  UserInputResponded: { requestId: string; response: unknown }
  SettingsChanged: { settings: unknown }
  ToolRegistered: { toolName: string }
  ToolRemoved: { toolName: string }
  SkillLoaded: { skillName: string }
  SkillUnloaded: { skillName: string }
}

export type EventKey = keyof EventMap

export type EventEnvelope<K extends EventKey = EventKey> = {
  id: string
  kind: K
  params: EventMap[K]
  sessionId?: SessionId
  publisherId: PublisherId
  correlationId: string
  causationId?: string
  timestamp: number
  sequence: number
}

export type AnyEvent = {
  [K in EventKey]: EventEnvelope<K>
}[EventKey]

export type PublishOptions = {
  sessionId?: SessionId
  correlationId?: string
  causationId?: string
}

const newId = () => crypto.randomUUID()

export class EventBus {
  private readonly pubsub: PubSub.PubSub<AnyEvent>
  private nextSequence = 0

  constructor() {
    this.pubsub = Effect.runSync(PubSub.unbounded<AnyEvent>())
  }

  subscribe<K extends EventKey>(
    kind: K,
    handler: (event: EventEnvelope<K>) => void
  ): Effect.Effect<void> {
    return Stream.fromPubSub(this.pubsub).pipe(
      Stream.filter((event): event is EventEnvelope<K> => event.kind === kind),
      Stream.runForEach(event => Effect.sync(() => handler(event)))
    )
  }

  subscribeAll(handler: (event: AnyEvent) => void): Effect.Effect<void> {
    return Stream.fromPubSub(this.pubsub).pipe(
      Stream.runForEach(event => Effect.sync(() => handler(event)))
    )
  }

  subscribeToSession(
    sessionId: SessionId,
    handler: (event: AnyEvent) => void
  ): Effect.Effect<void> {
    return Stream.fromPubSub(this.pubsub).pipe(
      Stream.filter(event => event.sessionId === sessionId),
      Stream.runForEach(event => Effect.sync(() => handler(event)))
    )
  }

  publish<K extends EventKey>(
    event: { kind: K; params: EventMap[K] },
    publisherId: PublisherId,
    options: PublishOptions = {}
  ): Effect.Effect<EventEnvelope<K>> {
    const envelope: EventEnvelope<K> = {
      id: newId(),
      kind: event.kind,
      params: event.params,
      publisherId,
      correlationId: options.correlationId ?? newId(),
      timestamp: Date.now(),
      sequence: ++this.nextSequence,
      ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
      ...(options.causationId === undefined ? {} : { causationId: options.causationId })
    }

    return PubSub.publish(this.pubsub, envelope).pipe(
      Effect.as(envelope),
      Effect.catchAllCause(cause =>
        Effect.sync(() => {
          console.error("EventBus publish failed:", cause)
          return envelope
        })
      )
    )
  }

  publishAny(event: AnyEvent): Effect.Effect<void> {
    return PubSub.publish(this.pubsub, event).pipe(Effect.asVoid)
  }
}

export class SessionBus {
  constructor(
    public readonly sessionId: SessionId,
    private readonly coreBus: EventBus
  ) {}

  subscribe<K extends EventKey>(
    kind: K,
    handler: (event: EventEnvelope<K>) => void
  ): Effect.Effect<void> {
    return this.coreBus.subscribe(kind, event => {
      if (event.sessionId === this.sessionId) handler(event)
    })
  }

  subscribeAll(handler: (event: AnyEvent) => void): Effect.Effect<void> {
    return this.coreBus.subscribeToSession(this.sessionId, handler)
  }

  publish<K extends EventKey>(
    event: { kind: K; params: EventMap[K] },
    publisherId: PublisherId,
    options: Omit<PublishOptions, "sessionId"> = {}
  ): Effect.Effect<EventEnvelope<K>> {
    return this.coreBus.publish(event, publisherId, {
      ...options,
      sessionId: this.sessionId
    })
  }
}

export const eventBus = new EventBus()
