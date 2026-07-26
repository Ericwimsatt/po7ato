import { Tool } from "../tool";
import { Effect } from "effect";

type suggestedAnswer = {
    answer: string;
}

type question = {
    question: string;
    suggestedAnswers: suggestedAnswer[];
}


const requestUserInput: Tool = (params: { questions: question[]}, publisherId: string) => {
    // TODO: not sure if I get sessionID here, or every eventbusPublish will use it
    eventBus.publish({kind: "user-input-requested", questions: params.questions}, publisherId);
    return Effect
}

const requestUserInputTool = new Tool(
    "request-user-input",
    "Request input from the user",
    requestUserInput
)

export { requestUserInputTool }