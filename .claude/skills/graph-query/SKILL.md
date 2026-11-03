---
name: graph-query
description: Read the target repo as a typed code graph (from fe-harness, in .harness/) before grepping — for blast radius, importers/exporters, entry points, and locating features.
---

# graph-query — read the codebase as a graph

The graph is produced by **fe-harness** and lives in the target repo's `.harness/`:
- `.harness/REPO_MAP.md` — human overview (languages, entry points, most-depended-upon files).
- `.harness/graph/nodes.jsonl` — one JSON node per line (`file` / `symbol` / `package`).
- `.harness/graph/edges.jsonl` — one JSON edge per line (`imports` / `exports` / `depends_on`).
- `.harness/graph/index.json` — counts, `generated_at`, per-file hashes.

Policy (when to use it, freshness, fallback): `.claude/rules/graph-first.md`.

## How to query

**Fastest for a human-readable overview:** read `.harness/REPO_MAP.md`.

**For precise structure, read the JSONL** (each line is JSON):

| Goal | Approach |
|------|----------|
| Find a node by name | `grep -i "<name>" .harness/graph/nodes.jsonl` |
| What a file imports | `grep '"from":"<file>"' .harness/graph/edges.jsonl` (outgoing `imports`) |
| Who imports a file (blast radius) | `grep '"to":"<file>"' .harness/graph/edges.jsonl` (incoming) |
| Most-depended-upon files | `.harness/REPO_MAP.md` → "Most depended-upon files" |
| Entry points | `.harness/REPO_MAP.md` → "Likely entry points" |

(Exact field names: open one line of `edges.jsonl` to confirm the `from`/`to`/`kind`
keys for this schema version, then filter accordingly.)

**Refresh:** if the graph is stale, run `fe-harness reindex` in the target repo
(alias: `npm run update-harness-graph` where wired).

## Limits (heuristic extractor, today)
- Captures **files + import/export edges** reliably.
- Does NOT capture call-graphs, hook usage, JSX component wiring, or dynamic/string-keyed
  imports — for those, read the source after the graph points you at the file.
- If a query returns nothing but the relationship likely exists at runtime, fall back to
  a narrowly scoped `Grep` and note both.
