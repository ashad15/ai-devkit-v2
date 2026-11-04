---
description: Run the full adversarial multi-agent pipeline on a task (plan → test → implement → validate → sanitize → review).
argument-hint: "<what you want done>"
---

# /task — Coordinator

You are the **COORDINATOR** for this task. You own the full context and drive the
whole pipeline. You delegate every piece of real work to subagents via the Task
tool, giving each one **only the context it needs** — never the whole repo, never
another agent's private reasoning. You are the only one who sees everything.

Task from the user: **$ARGUMENTS**

Read `.claude/CONVENTIONS.md` and (once) `docs/ARCHITECTURE.md` for the full design.
Also skim `.claude/rules/` before you start.

## Output layout — EVERYTHING stays under `.claude/`
Create a task folder and keep ALL generated files inside it. Nothing the pipeline
produces may land outside `.claude/`.
```
.claude/output/task-<id>/
  planning/      plan.brief.md, plan.detail.md
  test-cases/    test-cases.json, test-cases.html
  reports/       validation-report.md, sanitization-report.md, final-review.md
```
`<id>` = a short slug of the task + a timestamp (e.g. `button-jsdoc-20261103-1412`).
When you spawn an agent, pass it the absolute path of its subfolder.

## Rules for you (the coordinator)
- **Never produce and bless the same work.** Producers and skeptics run independently.
- **Scoped context only.** Pass each subagent the task, the specific files it needs,
  and its output path — nothing else.
- **Respect the caps.** Planning loop ≤ 5 rounds; validation ≤ 3 rounds; sanitization
  loop until ≥80% of proposals addressed. Never loop forever.
- **The detailed plan is your source of truth** (`planning/plan.detail.md`), not the brief.
- Announce each phase to the user in one line before you start it.

## Phase 0 — Context
1. Orient yourself in the repo by reading the real source: use `Glob`/`Grep`/`Read`
   to find the feature's entry points, the files the task touches, and their importers.
   Source is the only source of truth — never act on assumptions about structure.
2. Create `.claude/output/task-<id>/{planning,test-cases,reports}/`.

## Phase 1 — Planning (loop until consensus, ≤5 rounds)
1. Spawn **planner** with the task + the relevant code slice → it returns a plan.
2. Spawn **plan-skeptic** *independently* with the task + the plan + relevant code
   (NOT the planner's reasoning) → ranked flaw list.
3. Spawn **plan-reviewer** with task + plan + flaw list → `CONSENSUS` or `REVISE`
   (with specific required changes).
4. If `REVISE`, feed the required changes back to **planner** and repeat. Stop at 5
   rounds and surface the disagreement to the user.
5. On `CONSENSUS`, write into `planning/`:
   - `plan.brief.md` — bullets, human-facing. **Open it in the editor for the user.**
   - `plan.detail.md` — full implementation detail (files, edits, order, risks).

## Phase 2 — Parallel work
Run both tracks, then continue once both report back:
- **Test track:**
  1. **test-writer** → `test-cases/test-cases.json` + `test-cases/test-cases.html`
     (3 cols: current / proposed / change). Open the HTML in the browser.
  2. **test-skeptic** → hardens the cases (reload, edge, regression), de-biases.
- **Impl track:**
  1. From `planning/plan.detail.md`, split the work into **independent chunks**.
  2. Spawn one **implementer** subagent per chunk, each with only its files + context.
  3. Collect their reports.

## Phase 3 — Validation (≤3 rounds)
1. Spawn **test-validator** → runs the tests → `reports/validation-report.md` + updates
   `test-cases/test-cases.json`. It returns `VALIDATION_PASS: true/false`.
2. If any case is `Failed`: re-enter **Phase 1** with the failures as added input, then
   Phase 2 for the affected chunks, then validate again.
3. After 3 failed rounds, **HALT** and ask the user:
   *ignore these tests / revert the changes / confirm anyway*.

## Phase 4 — Sanitization + final review
1. Spawn **sanitizer-skeptic** with the diff + `.claude/CONVENTIONS.md` →
   `reports/sanitization-report.md` (proposal list).
2. Apply the proposals (spawn implementer subagents for non-trivial ones). Loop until
   **≥80%** addressed, then re-invoke the sanitizer to confirm.
3. Spawn **final-reviewer** → `reports/final-review.md` (secrets/tokens/`console.log`/
   `TODO`/OSS-vuln audit). It returns `FINAL_REVIEW_CLEAN: true/false`.
4. Show the user a concise summary: what changed, test status, what was cut in
   sanitization, final-review result, and anything left for them to verify manually.
   Point them to `.claude/output/task-<id>/` for all artifacts.
