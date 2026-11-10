# claude-devkit — Architecture

An **adversarial multi-agent engineering org**, run by Claude Code, that turns a
single prompt (`/task "<what you want>"`) into reviewed, tested, standards-clean
code. It is the Claude Code counterpart to `ai-devkit` (which targets Cursor):
same agent brains, re-platformed onto Claude Code's subagents, slash commands,
and skills — and upgraded from a linear pipeline into a coordinator-led org with
**adversarial skeptics** at every phase.

> Design principle: **the model is cheap to ask and expensive to trust.** So we
> never let one agent both produce and bless its own work. Producers and critics
> run **independently** (unbiased), and a reconciler decides. Quality comes from
> the structure, not from any single agent being smart.

---

## 1. The org chart

```
                         ┌─────────────────┐
            /task ───────►   COORDINATOR    │  (the boss — holds full context,
                         │   (main session) │   drives every phase, hands each
                         └───────┬─────────-┘   agent ONLY its scoped context)
                                 │
   ┌──────────────PLANNING (quick, ≤2 rounds)─────────────────┐
   │  planner ── writes plan.detail.md + plan.brief.md        │
   │     │                                                    │
   │  plan-skeptic ── own context; BLOCKER/MAJOR flaws first  │
   │     │                                                    │
   │  plan-reviewer ── quick verdict ─► at most one revision  │
   └──────────────────────────────────────────────────────────┘
                                 │  (consensus)
                                 ▼
          two plan files:  plan.brief.md (for you) + plan.detail.md (for agents)
                                 │
   ┌──────────────── PARALLEL WORK (coordinator fans out) ─────┐
   │  TEST track:   test-writer ─► test-skeptic (harden)       │
   │  IMPL track:   impl sub-agent #1 ┐                        │
   │                impl sub-agent #2 ├─ scoped, independent   │
   │                impl sub-agent #N ┘  chunks → report back  │
   └───────────────────────────────────────────────────────────┘
                                 │
                                 ▼
              VALIDATION:  test-validator (adversarial) runs tests
                   │ fail → impl fix, or re-PLAN if the plan is wrong (max 3 rounds)
                   │ still failing after 3 → HALT, ask the user
                   ▼ pass
         SANITIZATION:  sanitizer-skeptic enforces CONVENTIONS.md line-by-line
                   │ proposes cuts/reuse/shortening → coordinator applies
                   │ apply until ≥80% addressed, then one confirm pass
                   ▼
            FINAL REVIEW:  no secrets / console.log / TODO / vulns (OSS)
                   ▼
              Summary shown to the user.
```

---

## 2. The agents

| # | Agent | Role | Adversarial | Ported from ai-devkit |
|---|-------|------|:-----------:|-----------------------|
| 0 | **coordinator** | Owns full context; sequences all phases; gives each agent *scoped* context, never the whole thing | — | new |
| 1 | **planner** | Quickly produce the implementation plan (what/where/how) and write the two plan files | — | `planner` |
| 2 | **plan-skeptic** | One quick pass for the flaws that would make the plan fail (BLOCKER/MAJOR first); runs in its own context so it isn't biased | ✅ | new |
| 3 | **plan-reviewer** | Quick check: reconcile planner vs. plan-skeptic → consensus verdict | — | new |
| 4 | **test-writer** | Write the `test-cases.json` test matrix | — | `testCaseWriter` |
| 5 | **test-skeptic** | Harden/de-bias the test cases (reload, edge, regression) | ✅ | new |
| 6 | **implementer** (×N) | Each sub-agent builds ONE independent chunk from scoped context | — | `implementer` |
| 7 | **test-validator** | Run tests adversarially — "scores" on failures found | ✅ | `validator` |
| 8 | **sanitizer-skeptic** | Line-by-line: dead/bloated/non-reused code vs. `CONVENTIONS.md` | ✅ | `reviewer` |
| 9 | **final-reviewer** | Secrets, tokens, `console.log`, TODOs, OSS/vuln audit | ✅ | new |

"Adversarial" / "scores points" is a **prompt-framing device**: the agent is told
its job is to *find problems*, not to approve. There is no literal scoreboard.

---

## 3. The phases in detail

### Phase 1 — Planning (quick, ≤2 rounds)
1. Coordinator orients itself by reading the relevant source directly
   (`Glob`/`Grep`/`Read`) — entry points, touched files, and their importers. It then
   asks you **once** to switch to accept-edits mode, which covers every agent's file
   edits, and writes `planning/context.md`, a facts-only pack every agent starts from.
2. **planner** writes two artifacts:
   - `plan.detail.md` — full implementation detail; the **coordinator and downstream
     agents work off this one**.
   - `plan.brief.md` — bullets, human-facing; **linked for you** once the plan passes
     review.
3. **plan-skeptic** reads the plan in its own context (**not** the planner's reasoning)
   and returns a short flaw list, BLOCKER/MAJOR first → **plan-reviewer** quick-checks
   it → verdict. Only a VALID BLOCKER/MAJOR forces `REVISE`; MINOR/PARTIAL flaws become
   implementer notes.
4. On `REVISE`, the same planner revises once (resumed with its context) and the same
   reviewer re-checks just those changes — no second skeptic pass. Still `REVISE` →
   surfaced to you. A SIMPLE task can take the fast path instead (§8).

### Phase 2 — Parallel work
Coordinator starts two tracks at once:
- **Test track:** test-writer → `test-cases.json` (reviewable). Then **test-skeptic**
  adds the missing cases (reload behavior, edge cases, regressions) and checks for bias.
- **Impl track:** coordinator splits the work into **independent chunks** (e.g.
  target-screen / peers / …) and spawns **N implementer sub-agents**, each given only
  the files and context for its chunk. They implement and report back.

### Phase 3 — Validation (max 3 rounds)
- **test-validator** runs the tests adversarially. On any failure it returns a custom
  report to the coordinator.
- Each failed case is tagged `impl` (the code doesn't match the plan) or `plan` (the plan
  can't satisfy it). `impl` failures go straight back to the implementer for the affected
  chunk; only `plan` failures re-enter **Phase 1** → full flow again.
- **Cap: 3 validation rounds.** If still failing, **HALT** and ask the user:
  *ignore these tests / revert the changes / confirm anyway*.

### Phase 4 — Sanitization + final review
- **sanitizer-skeptic** reviews every changed line against `CONVENTIONS.md`: removes
  dead/unused code, collapses "30 lines that should be 3", flags non-reuse, enforces
  file-structure and the ≤500-line cap. Returns a proposal list.
- Coordinator applies them until **≥80%** are addressed, then runs one confirm pass (the
  sanitizer checks its own proposal IDs and doesn't hunt for new ones).
- **final-reviewer**: no secrets/tokens, no `console.log`, no `TODO`, OSS/vuln check.
- Coordinator shows the user the final summary of everything done.

---

## 4. Artifacts — everything under `.ai-devkit/output/task-<id>/`

All pipeline output stays inside `.ai-devkit/output/`, which the installer git-ignores in
the target repo. Not `.claude/`: Claude Code protects that folder and asks before every
write there, in every permission mode.
```
.ai-devkit/output/task-<id>/
  planning/    context.md, plan.brief.md, plan.detail.md
  test-cases/  test-cases.json
  reports/     changes.diff, validation-report.md, sanitization-report.md, final-review.md
```

| File | For | Contents |
|------|-----|----------|
| `planning/context.md` | agents | facts-only context pack: touched files, importers, excerpts, check commands |
| `planning/plan.brief.md` | human | bullet plan, linked for you |
| `planning/plan.detail.md` | agents | full implementation plan (source of truth) |
| `test-cases/test-cases.json` | agents + review | structured test matrix |
| `reports/changes.diff` | agents | the task's diff + new files, saved by the last validation round |
| `reports/validation-report.md` | coordinator | pass/fail per test, per round |
| `reports/sanitization-report.md` | coordinator | proposed cuts/reuse/shortening + status |
| `reports/final-review.md` | human | security/quality sign-off + summary |

---

## 5. Context & scoping

- The coordinator orients itself by reading the target repo's source directly with
  `Glob`/`Grep`/`Read` — entry points, the files a task touches, and their importers.
  There is no external indexer or graph step; source is the only source of truth. The
  coordinator gathers this once into `planning/context.md`, and agents start from that
  pack instead of each re-exploring the repo.
- **Scoped context is the rule:** sub-agents receive only the files they need, never
  the whole repo. This keeps them unbiased, cheap, and focused.

---

## 6. Coding standards

`.claude/CONVENTIONS.md` is the enforceable standard the **sanitizer-skeptic**
applies. It is derived from how `nextgen-opportunity-catalyst-ui` is actually
written. Highlights (see the file for the full, evidence-backed rules):

- Per-feature split: `const/`, `helpers/`, `types/`, `components/`, `tests/`.
- `.tsx`/`.ts` ordering: imports → `useState` → other hooks → small non-exported
  helpers (≤30–50 lines) → render/return.
- Constants (timeouts, magic numbers, keys) live in the constants file; big/non-main
  functions in the helpers file; types in the types file.
- **No file over ~500 lines.**

---

## 7. How it maps onto Claude Code

| Concept | Claude Code mechanism |
|---------|-----------------------|
| `/task` | slash command → `.claude/commands/task.md` |
| coordinator | the main Claude Code session, following `task.md` |
| each agent | a subagent → `.claude/agents/<name>.md`, invoked via the Task tool in an isolated context |
| "independent / unbiased" | subagent context isolation — each gets only scoped input |
| agent skills / how-they-work | `.claude/skills/` (none shipped currently) |
| context / orientation | read source directly via `Glob`/`Grep`/`Read` |
| coding standard | `CONVENTIONS.md`, read by the sanitizer |

---

## 8. Cost & limits (read this)

A single `/task` can fan out to **dozens of agent invocations** (planning triad loop
+ test track + N implementers + up to 3 validation rounds + sanitization loop).
On a Claude Pro/Max subscription these draw from one **shared usage window** — a
heavy task can exhaust it. Mitigations built into the design: hard round caps, one
shared context pack, an `effort` level in each agent's frontmatter (so subagents don't
inherit a session-wide `xhigh`), `impl` failures fixed without re-planning, each check
run once per validation round, and a **fast path** for SIMPLE tasks (planner →
implementer → validator → final-reviewer, with the user's OK).

---

## 9. Build status (phased)

- [ ] **Step 0** — repo scaffold, ported agent brains, `CONVENTIONS.md`.
- [ ] **Step 1** — `/task` → coordinator + planning triad → two plan files. *(vertical slice)*
- [ ] **Step 2** — test-writer + test-skeptic.
- [ ] **Step 3** — implementer fan-out + test-validator + 3× retry.
- [ ] **Step 4** — sanitizer-skeptic + final-reviewer.
