import { Brand, Effect } from "effect";
import type { SessionId } from "../../sessionId.js";
import { Tool } from "../../tools/tool.js";
export type PublisherId = string & Brand.Brand<"PublisherId">;
export type AgentSessionRequestedArgs = {
    sessionId: SessionId;
    prompt: string;
    mode: "build" | "plan" | "ask";
};
export type EventMap = {
    "AgentSessionRequested": {
        sessionId: SessionId;
        prompt: string;
        mode: "build" | "plan" | "ask";
    };
    "AgentSessionStarted": {
        streamId: string;
    };
    "AgentSessionFinished": {};
    "ToolRequested": {
        tool: Tool;
        requestId: string;
    };
    "ToolResponse": {
        tool: Tool;
        requestId: string;
        response: any;
    };
    "user-input-requested": {
        questions: any[];
    };
};
type BusEvent<K extends keyof EventMap = keyof EventMap> = {
    kind: K;
    publisherId: PublisherId;
    params: EventMap[K];
};
declare class EventBus {
    subscribe<K extends keyof EventMap>(kind: K, handler: (event: BusEvent<K>) => Effect.Effect<void>): void;
    publish(event: BusEvent, publisherId: PublisherId): void;
    generatePublisherId(): PublisherId;
}
export declare const eventBus: EventBus;
export {};
//# sourceMappingURL=EventBus.d.ts.map