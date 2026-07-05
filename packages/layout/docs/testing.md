# Testing

> Repo-wide rules: `.github/instructions/tests.instructions.md`. This doc
> covers what is specific to `@deephaven/layout`.

## Layout of tests

Tests live in `__tests__` folders next to the code they cover:

- `src/state/__tests__/` — the pure reducer/normalize/compact/hydrate logic
  (`reducer.test.ts`, `normalize.test.ts`, `compact.test.ts`, `hydrate.test.ts`,
  plus shared `fixtures.ts`).
- `src/components/__tests__/`, `src/dnd/__tests__/`, `src/hooks/__tests__/` —
  React and DOM-facing behavior.

Prefer testing pure logic in `state/` directly — it has no React/DOM
dependencies, so those tests are fast and precise. Push as much behavior as
possible into `state/` so it can be tested there.

## Running

```bash
# single file (auto-runs build:necessary / icons first)
npm run test:unit -- packages/layout/src/state/__tests__/reducer.test.ts

# by name pattern
npm run test:unit -- reducer

# lint just this package's changed files
npx eslint packages/layout/src/**/*.ts
npx stylelint packages/layout/src/**/*.scss

# type-check
npx tsc --build packages/layout/tsconfig.json
```

Unit tests resolve workspace packages from source (Jest `moduleNameMapper`), so
you do not need to rebuild dependencies between edits.

## What to test where

| Change                 | Add tests in                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| New/edited transform   | `state/__tests__/reducer.test.ts` — assert the resolved tree, empty-container collapse, and re-normalization.                  |
| New normalization rule | `state/__tests__/normalize.test.ts` — include an idempotency assertion (`normalize(normalize(x)) === normalize(x)` shape).     |
| Serialization change   | `state/__tests__/hydrate.test.ts` — round-trip dehydrate→hydrate, and back-compat for older payloads (e.g. missing `popouts`). |
| Compaction             | `state/__tests__/compact.test.ts` — `compact` result renders identically to the pre-compaction state.                          |
| Drop geometry          | `dnd/__tests__` — `computeDropZone` / outer-edge / insert-index cases.                                                         |
| Rendering / hooks      | co-located `__tests__` with Testing Library.                                                                                   |

Use the shared `fixtures.ts` for sample trees rather than re-authoring them.

## Conventions

- Test observable behavior (the resolved tree, dispatched transform, rendered
  output), not private helpers.
- Reducers are pure — assert immutability where it matters (input tree not
  mutated) and that ids/`activeId` stay canonical.
- Keep new pure logic side-effect-free so it is unit-testable without mocks.
- `DH_LOG_LEVEL=4 npm test` surfaces `@deephaven/log` output (suppressed by
  default) when debugging popout/persistence paths.

## When behavior changes

Per the repo test-review rules, new logic and bug fixes need unit tests. Update
the fixtures and the relevant doc in `docs/` in the same change so the
documentation and tests stay in sync with the code.
