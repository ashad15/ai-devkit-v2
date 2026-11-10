# claude-devkit

An **adversarial multi-agent engineering org**, run by Claude Code. You give it one
prompt; a **coordinator** drives a pipeline of specialist agents — with independent
**skeptics** at every phase — to produce reviewed, tested, standards-clean code.

It's the Claude Code counterpart to `ai-devkit` (which targets Cursor): same agent
brains, re-platformed onto Claude Code's subagents, slash commands, and skills.

```
/task "<what you want>"
   → coordinator
      → PLAN     (planner → plan-skeptic → plan-reviewer, quick, ≤2 rounds)
      → TEST     (test-writer → test-skeptic)      ⎫ in
      → BUILD    (N implementer sub-agents, scoped) ⎭ parallel
      → VALIDATE (test-validator, ≤3 retries)
      → SANITIZE (sanitizer-skeptic vs CONVENTIONS.md, until ≥80% fixed)
      → REVIEW   (final-reviewer: secrets / logs / TODO / vulns)
   → summary to you
```

## Why skeptics
The model is cheap to ask and expensive to trust, so **no agent blesses its own work.**
Producers and critics run in **independent contexts** (unbiased), and a reconciler
decides. Quality comes from the structure, not from any single agent being clever.

## Layout
```
.claude/
  commands/task.md        # /task — the coordinator's playbook
  agents/                 # the 9 specialist subagents
    planner.md  plan-skeptic.md  plan-reviewer.md
    test-writer.md  test-skeptic.md  implementer.md
    test-validator.md  sanitizer-skeptic.md  final-reviewer.md
  rules/                  # pipeline contract, conventions pointer
  secrets/README.md       # where local MCP secrets go (never committed)
  CONVENTIONS.md          # the enforceable coding standard (from the target repo)
bin/ai-devkit-v2.js       # the installer CLI
docs/ARCHITECTURE.md      # full design + phases + caps
.ai-devkit/output/        # runtime artifacts per task (git-ignored): planning/ test-cases/ reports/
```

## Requirements
- **Claude Code CLI**, logged in with a Pro/Max subscription (`claude auth login`).

The coordinator orients itself by reading the target repo's source directly
(`Glob`/`Grep`/`Read`) — no external indexer or graph step is required.

## Install into a target repo
These `.claude/` assets + `CONVENTIONS.md` are dropped into (or symlinked from) the
target repo so Claude Code loads them there. (Installer script TBD — see
`docs/ARCHITECTURE.md` §9.)

## Run
```
/task "add email format validation to the signup form"
```
Per-task artifacts land in `.ai-devkit/output/task-<id>/` (plan.brief.md,
plan.detail.md, test-cases.json, reports); you get a link to the brief plan.

At the start, `/task` asks you once to switch to **accept-edits** mode, which approves
every agent's file edits for the run. Commands still ask, but they're batched into a few
calls (about one per validation round). Where your org's policy allows custom permission
rules, you can pre-approve the check commands with `/permissions`.

## ⚠️ Cost
One `/task` can fan out to **dozens of agent invocations**. On a Pro/Max subscription
they share one usage window — a heavy task can exhaust it. Round caps and per-agent
effort levels are built in, and SIMPLE tasks can take a fast path (planner → implementer
→ validator → final review).

## Status
Early build. See `docs/ARCHITECTURE.md` §9 for the phased plan. Step 0 (scaffold +
agents + conventions) is in place; the `/task` orchestration is written; live wiring
and the installer are next.
