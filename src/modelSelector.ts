/** Defaults to OpenRouter's free-model router; pin a model with OPENROUTER_MODEL. */
const modelSelector = () => process.env.OPENROUTER_MODEL ?? "openrouter/free"

export default modelSelector
