# Rule: coding conventions

All code the pipeline writes must follow **`.claude/CONVENTIONS.md`** — the enforceable
standard derived from the target repo. Two tiers:

- **Enforced** — already failable in the target repo's CI (formatter, linter, strict
  TypeScript, architecture boundaries, design-system controls, security rules). Breaking
  these breaks the build. The **implementer** must not introduce violations; the
  **test-validator** runs the checks; the **final-reviewer** catches security leaks.
- **House rules** — folder structure (`const/`/`helpers/`/`types/`/`components/`),
  within-file ordering, naming, no bloat / no dead code / reuse, "why" doc-comments,
  component size target. The **sanitizer-skeptic** enforces these line-by-line.

When unsure, **match a sibling file** in the same feature. Read `.claude/CONVENTIONS.md`
in full before implementing or sanitizing.
