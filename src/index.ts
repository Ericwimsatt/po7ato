import { Effect, Console } from "effect"
import "./SessionHandler.js"
import "./tools/toolRegister.js"

const program = Console.log("Hello, World!")

Effect.runSync(program)
