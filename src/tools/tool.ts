import { Effect } from "effect";

class Tool {
    constructor(public name: string, public description: string, public execute: (params: any, publisherId: string) => Effect.Effect<any>) {
    }
}

export { Tool }