# Rule: graph-first retrieval

For any **structural** question about the target repo, consult the graph BEFORE you
grep or read files. The graph is orientation; source is truth.

## When this fires
Use the graph first for questions like:

| Question | Where to look |
|----------|---------------|
| What depends on file X? (blast radius) | `.harness/graph/edges.jsonl` — reverse `imports` edges into X |
| Who imports / is imported by a file? | `edges.jsonl` filtered on that node |
| What are the most-depended-upon files? | `.harness/REPO_MAP.md` → "Most depended-upon files" |
| Where does feature F live / its entry points? | `REPO_MAP.md` + `nodes.jsonl` labels |
| Find nodes by name | `nodes.jsonl` — match id/label substring |

Mechanics (how to read/query): `.claude/skills/graph-query/SKILL.md`.

## Rules
1. **Graph first, grep second.** Only fall to free-form `Grep`/`Read` after the graph
   has pointed you at targets — or when the graph returns nothing but the relationship
   likely exists at runtime (dynamic import, string-keyed lookup, HOC wiring).
2. **Source is behavioral truth.** If the graph disagrees with the code, trust the code
   and note the graph is stale.
3. **Freshness.** If `.harness/graph/index.json` → `generated_at` is old, or files
   changed since, run `fe-harness reindex` first.
4. **The graph is generated, never hand-edited.** Wrong/missing answers → `fe-harness
   reindex` (and, longer-term, improve the extractor); never paper over with guesses.
5. **Cite evidence.** When an agent used the graph to justify a decision (e.g. impact
   analysis), it should name the file/edge it relied on in its report.

> The current extractor is heuristic (imports/exports). It captures file structure well
> but NOT call-graphs, hooks, or dynamic wiring — for those, read the source.
