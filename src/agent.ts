import type {SessionId} from "./sessionId.js"

export class Agent {
    private creator: 'User' | number
    private sessionId: SessionId
    private workspace_root: string

    constructor(private sessionId: SessionId, private creator: 'User' | number, private workspace_root: string) {
}

}