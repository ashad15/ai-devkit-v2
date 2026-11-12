# Rule 0 — TOP PRIORITY: every access is requested during planning, never mid-run

**This rule outranks every other rule, agent prompt, and phase instruction in the kit.**
If anything else says "ask the user" or "request permission" during execution, this
rule wins and that instruction does not apply.

The user must be able to approve once, walk away, and come back to a finished run.
So planning has to work out *everything the run will need* and ask for all of it in
one place. Execution never asks.

## What counts as "access"
Anything that would stop the run to get the user's permission or input:
- **Shell commands** — typecheck, lint, test, build, format, `git diff`/`status`,
  `npm audit`, anything a validator/reviewer will run.
- **File writes / edits / deletes** — as path globs (source, tests, `.claude/output/`).
- **Network** — package installs, registry calls, `WebFetch`/`WebSearch` domains.
- **MCP tools, credentials, env vars, secrets** — and any auth they need first.
- **Reads outside the repo.**
- **Git writes** — commit / branch / push. Default is **none** unless the task asks.
- **Launching things** — dev server, browser, editor (e.g. opening `plan.brief.md`
  and `test-cases.html`).

## The contract
1. **The planner lists them.** Every plan carries an **Access manifest**, covering
   *all* phases and agents (test-writer, implementers, test-validator, sanitization,
   final-reviewer), not just the implementation edits. One row per access: what ·
   exact scope (command pattern / path glob / domain / tool) · who needs it and in
   which phase · why. If none beyond read-only repo access, say so explicitly.
2. **The plan is checked for it.** The plan-skeptic hunts for accesses the manifest
   missed; the plan-reviewer treats a missing or incomplete manifest as a VALID
   blocker → `REVISE`.
3. **The coordinator asks once.** At the end of planning (Gate 2 in `task.md`) it
   presents the whole manifest in a single consolidated question, together with plan
   approval. Nothing in Phases 2–4 starts until the user has answered.
4. **Denied or changed access is a re-plan**, not a runtime workaround — the planner
   revises the plan without it, then the manifest is shown again.
5. **Execution is silent.** In Phases 2–4 no agent and not the coordinator asks the
   user for access, permission, or clarification. If a step turns out to need an
   access that was not approved: do **not** prompt and do **not** work around it —
   skip that step, record `BLOCKED: needs <access>` in the report, finish everything
   else, and surface it in the final summary.
6. **Pre-grant it.** Claude Code's own permission prompts are separate from this
   rule; the way to stop them is an allow-list. At Gate 2 the coordinator offers to
   write the approved entries as allow rules (via the `update-config` skill) and
   writes them only if the user says yes. Never grant itself access unasked.

## The one mid-run stop that remains
The validation-cap **HALT** (pipeline contract #4: 3 failed rounds → ask the user
*ignore / revert / confirm anyway*) stays. It is a decision about results, not an
access request, and it only happens after a run has already failed three times.
