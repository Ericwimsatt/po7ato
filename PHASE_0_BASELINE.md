# Phase 0 baseline

This records the smallest repeatable baseline for the current Po7ato runtime.

## Current behavior

The entry point imports the session and tool registrations, then logs `Hello,
World!` and exits. It does not accept user input, call a model, or produce a
session response yet. The existing smoke test verifies the startup message by
importing `src/index.ts` and observing `console.log`.

The current implementation is expected to remain a stub until Phase 1. The
baseline therefore treats a successful startup message and a clean process
exit as the observable behavior.

## Minimum local environment

- Node.js 20 or newer
- npm with the repository's `package-lock.json`
- Dependencies installed with `npm ci`

The baseline does not require network access, model credentials, or a running
external service.

## Feedback loop

From the repository root:

| Purpose | Command |
| --- | --- |
| Fast test run | `npm run test:run` |
| Interactive test development | `npm test` |
| Static checks | `npm run typecheck` |
| Build check | `npm run build` |
| Full verification pass | `npm run verify` |
| Manual smoke run | `npm run manual` |

`npm run manual` builds the entry point and runs the emitted JavaScript so the
manual check does not depend on the source runner's local IPC behavior.

## Baseline result

On 2026-08-12, the test run, typecheck, and build completed successfully. The
manual run printed `Hello, World!` and exited successfully from `dist/index.js`.

The source-level `npm start` command was also tried. In the restricted agent
environment, `tsx` failed before loading the program because it could not open
its local IPC pipe (`listen EPERM`). This is an environment limitation of the
runner, not an application failure; `npm run manual` provides the reliable
baseline command here.

## Phase 0 decisions

- **Supported development environment:** Node.js 20+ with npm and a locked
  dependency install. This is broad enough for local development while
  matching the current TypeScript/tsx toolchain.
- **Fast versus slow checks:** `test:run` is the edit-to-edit check; typecheck
  and build are included in `verify` because they are slower and catch issues
  outside the unit-test path.
- **Manual run:** run the built artifact with Node. This checks the actual
  packaged entry point and avoids coupling the baseline to a source-runner
  implementation detail.
