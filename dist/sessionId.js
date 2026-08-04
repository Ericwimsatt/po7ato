import { Brand } from "effect";
export function generateSessionId() {
    const uuid = crypto.randomUUID();
    const sessionId = Brand.nominal();
    return sessionId(uuid);
}
//# sourceMappingURL=sessionId.js.map