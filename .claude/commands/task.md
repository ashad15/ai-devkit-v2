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

Read `.claude/CONVENTIONS.md` before you start. The `.claude/rules/` files are already
in your context — don't re-read them. **`00-upfront-access.md` is top priority and
overrides anything below.**

**Do not start the pipeline silently.** `/task` asks the user only at Gate 1 (Phase 0)
and Gate 2 (end of Phase 1), plus the validation-cap HALT. Nothing is spawned before
Gate 1 and no code is touched before Gate 2.

## Output layout — EVERYTHING stays under `.ai-devkit/output/`
Keep ALL generated files in one task folder. Never write pipeline files into `.claude/`:
Claude Code protects that folder and asks before every write there, in every mode.
```
.ai-devkit/output/task-<id>/
  planning/      context.md, plan.brief.md, plan.detail.md
  test-cases/    test-cases.json
  reports/       changes.diff, validation-report.md, sanitization-report.md, final-review.md
```
`<id>` = a short slug of the task + a timestamp (e.g. `button-jsdoc-20261103-1412`).
When you spawn an agent, pass it the absolute path of its subfolder.

## Rules for you (the coordinator)
- **Never produce and bless the same work.** Producers and skeptics run independently.
- **Scoped context only.** Pass each subagent the task, `planning/context.md`, the
  specific files it needs, and its output path — nothing else.
- **Respect the caps.** Planning ≤ 2 rounds; validation ≤ 3 rounds; sanitizer ≤ 2 passes
  (review + one confirm). Never loop forever.
- **Pass paths, not contents.** Agents read files themselves; never paste a plan, report,
  or test matrix into a prompt.
- **Parallel means one message.** Spawn independent agents as multiple Agent calls in a
  single message so they run concurrently, not one after another.
- **Batch commands.** Each Bash call can stop the run for an approval prompt, so
  implementers run none and every other step that needs commands uses a single call.
- **The detailed plan is your source of truth** (`planning/plan.detail.md`), not the brief.
- Announce each phase to the user in one line before you start it.
- **Silent execution.** In Phases 2–4 never ask for access, permission, or clarification.
  A step needing unapproved access is skipped and recorded as `BLOCKED: needs <access>`
  — never prompt or work around it (`00-upfront-access.md`).

## Phase 0 — Context + Gate 1 (intake)
1. Orient yourself in the repo by reading the real source: use `Glob`/`Grep`/`Read`
   to find the feature's entry points, the files the task touches, and their importers.
   Source is the only source of truth — never act on assumptions about structure. Keep
   it short: the touched files and their direct importers, not the whole feature.
   (Read-only; this is the only work allowed before Gate 1.)
2. **Gate 1 — confirm before anything starts.**
   - If `$ARGUMENTS` is empty or too vague to restate in one sentence, ask what they
     want done and stop.
   - Otherwise restate your understanding in ≤3 lines (goal · areas of the code you
     found · what you're treating as out of scope), then ask with `AskUserQuestion`
     (≤4 questions): *go ahead / adjust* plus every real fork the source can't answer
     (approach, scope, behavior, acceptance). Don't ask what the code already tells you.
   - In the same message, ask them to switch to **accept-edits** mode (Shift+Tab in the
     terminal; the mode menu under the prompt box in VS Code) — it covers `context.md`,
     the plan files and every agent's edits for the run.
   - **Wait for the answers.** Fold them into the task statement you give the planner.
     If `AskUserQuestion` is unavailable, ask in plain text and end your turn.
3. Only after the user says go, write `.ai-devkit/output/task-<id>/planning/context.md`
   (writing a file creates its folders; no `mkdir` needed) — facts only, no plan or
   opinions, so skeptics stay independent: each touched file (path + role), its
   importers (blast radius), key excerpts with `file:line`, and the repo's check
   commands from `package.json`. Agents start from it instead of re-exploring the repo.

## Phase 1 — Planning (quick: plan → skeptic → review, ≤2 rounds)
1. Spawn **planner** with the task, `context.md`, and the `planning/` path → it writes
   `plan.detail.md` (full detail: files, edits, order, risks, **Access manifest**) +
   `plan.brief.md` and returns its complexity class (SIMPLE / MEDIUM / COMPLEX) and any
   open Decisions.
2. Spawn **plan-skeptic** *independently* with the task + `plan.detail.md` + `context.md`
   (NOT the planner's reasoning) → a short flaw list, BLOCKER/MAJOR first.
3. Spawn **plan-reviewer** with the task + `plan.detail.md` + the flaw list → a quick
   `CONSENSUS` or `REVISE` (with specific required changes).
4. If `REVISE`, send the required changes to the **same planner** with `SendMessage` (its
   agentId is in the spawn result; it keeps its context, so it doesn't re-read the code),
   then have the **same reviewer** re-check only those changes — no second skeptic pass.
   If an agent can't be resumed, spawn a fresh one with the file paths. Still `REVISE`
   after that → bring the disagreement to Gate 2 as an open Decision.
5. On `CONSENSUS`, append the reviewer's implementer notes to `plan.detail.md` and give
   the user a clickable link to `plan.brief.md`.
6. **Gate 2 — plan approval + every access request (the last time you ask).** One
   `AskUserQuestion` call (≤4 questions), which you wait on:
   - **Plan** — approve / change / cancel (the brief is already linked). If the class is
     **SIMPLE**, also offer the **fast path** (bottom of this file).
   - **Access manifest** — list *every* row; options: approve all + pre-grant as allow
     rules (via the `update-config` skill; it writes `.claude/settings*.json`, so expect
     that one write to prompt) / approve all / deny specific rows.
   - **Open Decisions** from the plan, if any (within the 4-question limit).

   A change or a denied access goes back to the same planner and reviewer as in step 4
   (user-driven, so outside the ≤2 cap), then you ask again. From here to the final
   summary: **no questions.**

## Phase 2 — Parallel work
1. From `planning/plan.detail.md`, split the work into **independent chunks**.
2. In **one message**, spawn **test-writer** (→ `test-cases/test-cases.json`) and one
   **implementer** per chunk, each with only its chunk, its files, and `context.md`.
3. When test-writer returns, spawn **test-skeptic** (hardens the cases: reload, edge,
   regression; de-biases) without waiting for the implementers.
4. Continue once test-skeptic and every implementer have reported back.

## Phase 3 — Validation (≤3 rounds)
1. Spawn **test-validator** → runs every check in one call → `reports/validation-report.md`
   + `reports/changes.diff` + updates `test-cases/test-cases.json`. It returns
   `VALIDATION_PASS: true/false` and tags each failed case `impl` or `plan`.
2. If any case is `Failed`, route by tag, then validate again:
   - only `impl` failures → re-spawn **implementer** for just the affected chunks, with
     the failure evidence. No re-plan.
   - any `plan` failure → re-enter **Phase 1** with the failures as added input, then
     Phase 2 for the affected chunks. A retry re-plan stays inside the approved
     manifest — it is not a new Gate 2.
3. After 3 failed rounds, **HALT** and ask the user:
   *ignore these tests / revert the changes / confirm anyway*. (The only mid-run stop —
   a decision about results, not an access request.)

## Phase 4 — Sanitization + final review
1. Spawn **sanitizer-skeptic** with `reports/changes.diff` (saved by the last validation
   round) + `.claude/CONVENTIONS.md` → `reports/sanitization-report.md` (proposal list).
2. Apply the proposals until **≥80%** are addressed: trivial ones yourself, non-trivial
   ones via implementer subagents — one per file, all spawned in one message.
3. Re-invoke the sanitizer **once** in confirm mode with its proposal list: it reports
   which IDs are addressed and does not hunt for new ones. Don't run it again.
4. Spawn **final-reviewer** → `reports/final-review.md` (secrets/tokens/`console.log`/
   `TODO`/OSS-vuln audit). It returns `FINAL_REVIEW_CLEAN: true/false`.
5. Show the user a concise summary: what changed, test status, what was cut in
   sanitization, final-review result, and anything left for them to verify manually.
   Point them to `.ai-devkit/output/task-<id>/` for all artifacts. List any
   `BLOCKED: needs <access>` items so they can approve and re-run just those.

## Fast path (SIMPLE tasks, user-approved at Gate 2)
Phases 0–1 and both gates run as normal (the skeptic/reviewer also check the Access
manifest). After Gate 2: one **implementer** → **test-validator** with no test matrix
(checks only; ≤3 rounds, fixes go straight back to the implementer) → **final-reviewer**
→ the Phase 4 summary.
