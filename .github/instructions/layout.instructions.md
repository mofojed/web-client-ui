---
applyTo:
  - 'packages/layout/**'
---

# @deephaven/layout

This is the React-native panel layout system (rows, columns, tabbed stacks,
splitters, drag-and-drop, cross-window popouts) — the eventual replacement for
`@deephaven/golden-layout`. Do not confuse it with the legacy `golden-layout` /
`dashboard` stack.

## Read the docs before changing code

The package documents itself. Start with the overview, then the subsystem doc
for the area you touch:

- [packages/layout/README.md](../../packages/layout/README.md) — overview, quick start, public API.
- [packages/layout/docs/architecture.md](../../packages/layout/docs/architecture.md) — module map, data flow, **invariants**.
- [packages/layout/docs/state-and-transforms.md](../../packages/layout/docs/state-and-transforms.md) — state shape, transforms, normalization.
- [packages/layout/docs/components.md](../../packages/layout/docs/components.md) — `Dashboard`, panel registry, portal-host model.
- [packages/layout/docs/drag-and-drop.md](../../packages/layout/docs/drag-and-drop.md) — drop zones and indicators.
- [packages/layout/docs/popouts.md](../../packages/layout/docs/popouts.md) — child windows and cross-window sync.
- [packages/layout/docs/testing.md](../../packages/layout/docs/testing.md) — test layout and commands.

## Non-negotiable rules

- **`Dashboard` is controlled.** All changes flow out via `onChange` and back in
  via the `layout` prop. Never add internal layout state.
- **Keep `src/state/**`pure** (no React, no DOM). Push logic there so it is
unit-testable, and test it in`src/state/**tests**`.
- **Normalize at every boundary.** The reducer assumes canonical input; run
  `normalize()` on hydrate and after each transform. Preserve the invariants in
  architecture.md.
- **Transforms and `panel.state` must be JSON-serializable.** No functions or
  class instances.
- **Preserve panel identity** across rearrangement via the persistent
  host/portal model — never re-parent panel React subtrees directly.

## Keep the docs current

Treat stale docs as a bug. In the same change that alters behavior, update:

- New transform / node type / `LayoutState` field → `docs/state-and-transforms.md`.
- New public export → `src/index.ts` and the API table in `README.md`.
- New component / hook / context → `docs/architecture.md`, `docs/components.md`.
- New drag/drop or popout behavior → the matching doc.
- New invariant → the Invariants section of `docs/architecture.md`.
