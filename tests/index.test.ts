import { afterEach, describe, expect, it, vi } from "vitest"

describe("application entry point", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("prints the current startup message", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined)

    await import("../src/index.js")

    expect(log).toHaveBeenCalledWith("Hello, World!")
  })
})
