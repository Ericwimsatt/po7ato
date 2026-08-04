import { Brand, Effect, PubSub } from "effect";
import { Tool } from "../../tools/tool.js";
class EventBus {
    subscribe(kind, handler) {
        return;
    }
    publish(event, publisherId) {
        // const subscribers = this.subscribers[event.kind] || [];
        // for (const subscriber of subscribers) {
        //     subscriber(event);
        // }
    }
    generatePublisherId() {
        const uuid = crypto.randomUUID();
        const publisherId = Brand.nominal();
        return publisherId(uuid);
    }
}
export const eventBus = new EventBus();
//# sourceMappingURL=EventBus.js.map