import {Brand} from "effect"

export type PublisherId = string & Brand.Brand<"PublisherId">

export function generatePublisherId(): PublisherId {
    const uuid = crypto.randomUUID()
    const publisherId = Brand.nominal<PublisherId>()

    return publisherId(uuid)
}