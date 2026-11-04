# Rule: the pipeline contract

`/task` is a workflow contract, not a free-for-all. The coordinator and every agent
obey these invariants.

1. **No producer blesses its own work.** Planner ≠ plan-skeptic ≠ plan-reviewer;
   implementer ≠ test-validator; nobody reviews their own output. Skeptics run in
   isolated context so they aren't biased by the producer's reasoning.
2. **Phases run in order**, and none is skipped unless the planner classifies the task
   SIMPLE and the user agrees: `CONTEXT → PLAN → TEST+IMPLEMENT → VALIDATE → SANITIZE → REVIEW`.
3. **Human-facing vs agent-facing artifacts are separate.** `plan.brief.md` is for the
   user (opened in the editor); `plan.detail.md` is the agents' source of truth.
4. **Caps are hard.** Planning consensus loop ≤ 5 rounds; validation retry ≤ 3 rounds
   (then HALT and ask the user); sanitization loops until ≥ 80% of proposals addressed.
5. **Scoped context.** Each subagent gets only the files + output path it needs.
   Fan-out implementation into independent chunks; never one agent doing it all.
6. **Explicit verdicts.** Gate agents end with a machine-checkable line:
   `VERDICT: CONSENSUS|REVISE` · `VALIDATION_PASS: true|false` · `FINAL_REVIEW_CLEAN: true|false`.
7. **Everything stays under `.claude/output/task-<id>/`.** No pipeline artifact outside `.claude/`.
8. **Code is the source of truth.** Ground every claim in real source you read with
   `Glob`/`Grep`/`Read`; never act on assumptions.
