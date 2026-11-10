# Rule: the pipeline contract

`/task` is a workflow contract, not a free-for-all. The coordinator and every agent
obey these invariants.

1. **No producer blesses its own work.** Planner ≠ plan-skeptic ≠ plan-reviewer;
   implementer ≠ test-validator; nobody reviews their own output. Skeptics run in
   isolated context so they aren't biased by the producer's reasoning.
2. **Phases run in order**, and none is skipped unless the planner classifies the task
   SIMPLE and the user agrees (then `/task`'s fast path runs):
   `CONTEXT → PLAN → TEST+IMPLEMENT → VALIDATE → SANITIZE → REVIEW`.
3. **Human-facing vs agent-facing artifacts are separate.** `plan.brief.md` is for the
   user (linked for them after planning); `plan.detail.md` is the agents' source of truth.
4. **Caps are hard.** Planning ≤ 2 rounds (plan → skeptic → review, then at most one
   revision that the reviewer re-checks); validation retry ≤ 3 rounds (then HALT and ask
   the user; `impl` failures go back to the implementer, only `plan` failures re-plan);
   sanitization applies fixes until ≥ 80% of proposals are addressed, with ≤ 2 sanitizer
   passes (review + one confirm).
5. **Scoped context.** Each subagent gets `planning/context.md` plus only the files +
   output path it needs.
   Fan-out implementation into independent chunks; never one agent doing it all.
6. **Explicit verdicts.** Gate agents end with a machine-checkable line:
   `VERDICT: CONSENSUS|REVISE` · `VALIDATION_PASS: true|false` · `FINAL_REVIEW_CLEAN: true|false`.
7. **Everything stays under `.ai-devkit/output/task-<id>/`** (git-ignored). No pipeline
   artifact anywhere else — never in `.claude/`, which Claude Code protects with a prompt
   on every write.
8. **Code is the source of truth.** Ground every claim in real source you read with
   `Glob`/`Grep`/`Read`; never act on assumptions.
9. **Access is asked once.** In Phase 0 the coordinator asks the user to switch to
   accept-edits mode, which covers every agent's file edits. Commands are batched —
   implementers run none, any other step uses one call — because each call can mean an
   approval prompt.
