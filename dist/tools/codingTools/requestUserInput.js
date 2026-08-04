import { Tool } from "../tool";
import { Effect } from "effect";
const requestUserInput = (params, publisherId) => {
    // TODO: not sure if I get sessionID here, or every eventbusPublish will use it
    eventBus.publish({ kind: "user-input-requested", questions: params.questions }, publisherId);
    return Effect;
};
const requestUserInputTool = new Tool("request-user-input", "Request input from the user", requestUserInput);
export { requestUserInputTool };
//# sourceMappingURL=requestUserInput.js.map