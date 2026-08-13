import "./SessionHandler.js"
import "./tools/toolRegister.js"
import { runCli } from "./cli.js"

if (process.stdin.isTTY) {
  console.error("Po7ato CLI: enter a request, one per line. Press Ctrl-D to exit.")
}

await runCli(undefined, undefined, undefined, { verbose: process.argv.includes("--verbose") })
