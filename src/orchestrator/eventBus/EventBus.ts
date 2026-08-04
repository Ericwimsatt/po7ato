import { Effect, PubSub, Stream } from "effect"
import type { SessionId } from "../../sessionId.js"
import type { PublisherId } from "../../publisherId.js"
import { Tool } from "../../tools/tool.js";


export type AgentSessionRequestedArgs = {
    sessionId: SessionId,
    prompt: string,
    mode: "build" | "plan" | "ask"
}

export type EventMap = {
    "AgentSessionRequested": { prompt: string, mode: "build" | "plan" | "ask", workspace?: string },
    "AgentSessionStarted": { sessionId: SessionId, requester: PublisherId },
    "AgentSessionFinished": {},
    "ToolRequested": { tool: Tool, requestId: string },
    "ToolResponse": { tool: Tool, requestId: string, response: any },
    "ToolExecuted": { toolName: string, params: any },
    "user-input-requested": { questions: any[] }
}

export type EventKey = keyof EventMap

type BusEvent<K extends keyof EventMap = keyof EventMap> = {
    kind: K
    publisherId: PublisherId
    params: EventMap[K]
}

export class EventBus {
    private pubsub: PubSub.PubSub<BusEvent>

    constructor() {
        this.pubsub = Effect.runSync(PubSub.unbounded<BusEvent>())
    }

    subscribe<K extends keyof EventMap>(
        kind: K,
        handler: (event: BusEvent<K>) => void
    ): Effect.Effect<void> {
        return Stream.fromPubSub(this.pubsub).pipe(
            Stream.filter((event): event is BusEvent<K> => event.kind === kind),
            Stream.runForEach((event) =>
                Effect.sync(() => handler(event))
            )
        )
    }

    publish<K extends keyof EventMap>(
        event: { kind: K; params: EventMap[K] },
        publisherId: PublisherId
    ): Effect.Effect<void> {
        return PubSub.publish(this.pubsub, {
            kind: event.kind,
            publisherId,
            params: event.params
        }).pipe(
            Effect.asVoid,
            Effect.catchAllCause((cause) =>
                Effect.sync(() => console.error("EventBus publish failed:", cause))
            )
        )
    }
}

export const eventBus = new EventBus()