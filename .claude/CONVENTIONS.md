# CONVENTIONS.md

The coding standard the **sanitizer-skeptic** enforces and every **implementer**
follows. Derived from how `nextgen-opportunity-catalyst-ui` is actually written.

Two tiers:
- **A. Enforced** — already failable in that repo's CI (`npm run check`: Prettier,
  ESLint type-checked, tsconfig strict, dependency-cruiser boundaries, the custom
  `ui-standards` policy). Breaking these breaks the build. Non-negotiable.
- **B. House rules** — structure/size/clarity standards we impose for agent-written
  code. Not all are in CI; the sanitizer enforces them.

> If a repo other than catalyst-ui uses this kit, re-derive Tier A from that repo's
> own config. Tier B travels.

---

## A. Enforced (CI will fail otherwise)

### Formatting (Prettier)
- **No semicolons** (`semi: false`), **single quotes**, `printWidth: 100`,
  `trailingComma: 'all'`, `arrowParens: 'always'`.

### TypeScript (tsconfig — full strict)
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
  `noUnusedLocals`, `noUnusedParameters`, `isolatedModules`, `verbatimModuleSyntax`.
- `exactOptionalPropertyTypes` → pass optional props via the spread pattern
  `{...(cond ? { prop: x } : {})}`, never `prop={undefined}`.

### ESLint (type-checked, strict)
- **No non-null assertions** (`!`).
- **Inline type imports**: `import { type Foo } from '...'` (not a separate
  `import type` line when mixing). Mandatory under `verbatimModuleSyntax`.
- **Banned imports**: `@radix-ui/themes`, `next`, `jwt-decode`, `jose`,
  `jsonwebtoken`, `@copilotkit/runtime`, `@ag-grid-enterprise/charts`. Radix =
  Primitives only (`@radix-ui/react-*`).
- **Security (non-waivable)**: no `localStorage` / `sessionStorage` / IndexedDB, no
  `document.cookie` writes, **no `Authorization` header handling anywhere**. Identity
  comes from the BFF's HttpOnly cookie; the SPA holds/parses no token.
- **Accessibility (strict `jsx-a11y`)**: no disabled a11y rules / inline suppressions
  outside a formal exception. Each route exposes exactly one `main` and one `h1` and is
  axe-clean; every Storybook story is axe-clean.

### Architecture boundaries (dependency-cruiser)
- Import direction is downward only: **routes → features → components → lib**.
- **Features must not import each other.** Share by moving code down into `lib`/`components`.
- **No import cycles.** `src/lib/domain` imports no React/router/API-client/styling.

### Design system (`ui-standards` policy)
- **Tokens only — no raw colors** (no hex/rgb/hsl/named) in component/feature/route
  source. Color via Tailwind theme utilities + CSS custom properties resolving to
  `src/styles/tokens.css`.
- **No arbitrary px** in Tailwind (use `rem`/tokens); px allowed only for borders,
  focus-ring, text-decoration, shadows, blur.
- Styling stack: Tailwind v4 + `class-variance-authority` (`cva`) for variants +
  `cn()` (`@/lib/cn`) for merging. `Button.tsx` is the canonical pattern.
- **`pendoId` required on every interactive element** (via the `Analyticsable` mixin),
  rendered as `id` + `data-pendo-id`, a stable hand-written literal (never generated).
- Tables = AG-Grid; charts/exhibits = Vega-Lite.
- **No manufactured financial facts** (company/ticker/metric/figure) outside
  `src/const/mockData/` and `src/const/storyData/`.
- **Pinned dependencies** — exact versions, no `^`/`~`, lockfile committed, `npm ci`.

### State
- **Server state = TanStack Query** (defined in `*Query.ts`); **client state = Zustand.**
  Anything outliving a render goes in one of these — never a module global.

---

## B. House rules (the sanitizer enforces these)

### Folder structure (per feature, `src/features/<feature>/`)
- `const/<feature>Constants.ts` — all author-time fixed values.
- `helpers/<feature>Helpers.ts` — **pure** functions only (no network, storage, React).
  Split by concern when it grows (e.g. a `…DecisionHelpers.ts` for visual judgements).
- `types/<feature>Types.ts` — wire shapes, props interfaces, local view types.
- `components/*.tsx` — presentational; `*.stories.tsx` co-located.
- `tests/*.test.ts(x)` for larger features (smaller ones may co-locate).
- Globally-shared constants → `src/const/globalConst/`; shared types → `@/components/types`.

### Within-file order (`.tsx`)
```
imports
export function Component(props) {
  // 1. hooks — ALL hooks before any early return (rules-of-hooks)
  // 2. derived constants from props/state
  return ( ...jsx... )
}
// 3. small non-exported helper components / fns live at the BOTTOM of the file
```
(Derived values from props may precede a hook; the hard rule is *all hooks before any
early return / JSX*.)

### What goes where
- **Constants file** holds: all user-facing strings/copy (no inline string literals in
  JSX), magic numbers & timings (name them with the unit, e.g. `AGENT_TEXT_POLL_MS`,
  use numeric separators `10_000`), analytics id literals + id-builder fns, enum→display
  lookup maps (`as const`). Nothing a service sends at runtime.
- **Helpers file** holds: pure, independently testable logic. Extraction is by
  *purity and reuse*, not line count — if it's pure and reusable, extract it.
- **Types file** holds: the feature's types/interfaces, richly commented.

### Naming
| Thing | Style | Example |
|---|---|---|
| Component file & component | PascalCase, file = component | `SizingTable.tsx` → `SizingTable` |
| Helper/service/query/type/hook file | camelCase | `caseForChangeHelpers.ts`, `useSession.ts` |
| Types file | `<feature>Types.ts` | `caseForChangeTypes.ts` |
| Constants file | `<feature>Constants.ts` | `caseForChangeConstants.ts` |
| Hook | `useXxx` | `useTargetSetup` |
| Fixed scalar/object const | `SCREAMING_SNAKE_CASE` | `PAGE_TITLE`, `SHIMMER_WAVE_STEP_MS` |
| Const *builder function* | camelCase | `framingPendoId`, `statusSelected` |
| Props interface | `<Component>Props` | `FramingDetailProps` |

### Imports
- `@/*` alias for cross-layer imports; relative (`../`, `./`) only within a feature.
- Order (hand-maintained): external packages → `@/` absolute → `../` parent →
  `./` sibling; roughly alphabetical within a group.

### Clarity & size (the sanitizer's main targets)
- **Every exported const, helper, type field, and component carries a "why" doc-comment**
  — the reasoning/decision, not just the what. This is the repo's strongest norm; preserve it.
- **No bloat.** If something can be 3 lines, it must not be 30. Collapse needless
  indirection, dead branches, and copy-paste into reuse.
- **No dead code.** Nothing added that isn't called/used.
- **Component files stay small and focused (~target ≤ 300–500 lines).** This is a
  *house target*, NOT a CI rule — and it explicitly does **not** apply to
  types/helpers/mock/story/spec files, which are routinely large in this codebase.
  Do not "split" a cohesive types or data file just to hit a number.

---

## Sanitizer scoring (how the sanitizer-skeptic thinks)
Points for finding: dead/unused code · 30-lines-that-should-be-3 · duplicated logic
that should be reused · inline strings that belong in constants · raw colors/px ·
missing "why" comments on new exports · convention drift. It proposes the smallest
change per finding; the coordinator applies them until **≥80%** are addressed.
