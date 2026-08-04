import { Effect } from "effect";
import { Tool } from "../tool.js";
import { eventBus } from "../../orchestrator/eventBus/EventBus.js";
import type { PublisherId } from "../../publisherId.js";

type suggestedAnswer = {
    answer: string;
}

type question = {
    question: string;
    suggestedAnswers: suggestedAnswer[];
}


const requestUserInput: (params: { questions: question[] }, publisherId: PublisherId) => Effect.Effect<void> = (params, publisherId) => {
    // TODO: not sure if I get sessionID here, or every eventbusPublish will use it
    return eventBus.publish(
        { kind: "user-input-requested", params: { questions: params.questions } },
        publisherId
    )
}

const requestUserInputTool = new Tool(
    "request-user-input",
    "Request input from the user",
    requestUserInput
)

export { requestUserInputTool }