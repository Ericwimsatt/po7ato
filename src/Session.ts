import { Stream, Effect, Chunk, PubSub } from "effect"
import { generateSessionId, type SessionId } from "./sessionId.js";
import modelSelector from "./modelSelector.js";
import { Agent } from "./agent.js";
import type { PublisherId } from "./publisherId.js";

/* Session that can be consumed by an end user */
export class Session {
    public sessionId: SessionId
    private fullOutput: string = ""
    private outputStream?: Stream.Stream<string>
    private agent: any
    private model: any
    private subAgents: any[] = []

    private PubSub?: PubSub.PubSub<BusEvent>

    constructor(private workspace_root: string, private creator: PublisherId) {
        this.sessionId = generateSessionId()
    }

    init() {
        this.createAgent()
        this.outputStream = Stream.async<string>((emit) => {
            this.fullOutput += "llm output"
            emit(Effect.succeed(Chunk.of("llm output")))
        })
    }

    createAgent() {
        this.model = modelSelector() // Based on user preferences, what's subscribed
        const agent = new Agent(this.sessionId, this.creator ?? 'User', this.workspace_root)
        this.agent = agent  
    }
}