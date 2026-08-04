import { Brand } from "effect"

export type SessionId = string & Brand.Brand<"SessionId">

export function generateSessionId(): SessionId {
    const uuid = crypto.randomUUID()
    const sessionId = Brand.nominal<SessionId>()

    return sessionId(uuid)
}