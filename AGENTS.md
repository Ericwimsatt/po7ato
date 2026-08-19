# Agent Instructions

## Tests

Colocate unit tests with the production code they cover. Use dedicated test directories only for integration or end-to-end tests.

## Decisions

Before non-trivial implementation, identify choices that could affect behavior, APIs, architecture, data, safety, or future compatibility. Ask 2–5 concrete questions when user input would materially help. Use the `decision` skill for competing viable approaches.

Proceed without asking only for mechanical, unambiguous changes or when explicitly authorized to choose. State important assumptions before editing.

## Learning-oriented explanations

This is a learning-oriented project about agents and coding agents. For non-trivial decisions and milestones:

- Explain the input-to-result flow, viable alternatives, recommendation, and key tradeoffs.
- Separate provider/protocol behavior from Po7ato's internal choices.
- Mention relevant state ownership, streaming, failure, cancellation, persistence, and event correlation.
- After implementation, summarize changed files, execution flow, tests, and limitations.

Use compact headings such as “Current flow,” “Alternatives,” and “Recommendation.” Define unfamiliar terms briefly.

For external research, prefer authoritative sources, link them, and distinguish facts from inferences.

For `Implementation_Order.md` milestones, record substantive decisions in a short phase note.

## Direct communication

Get to the point quickly. Prefer short paragraphs and focused bullets. Do not repeat context, restate the request, or explain routine steps. When updating `AGENTS.md`, keep the instruction narrowly scoped and remove redundant wording instead of adding more detail.
