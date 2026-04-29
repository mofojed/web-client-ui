# @deephaven/layout

A React-native panel layout system. Eventual replacement for `@deephaven/golden-layout`.

Status: **early development**. Phase 1 (pure-logic core) is the only thing landed; rendering, splitters, drag-and-drop, and the demo app come in subsequent phases.

## Concepts

A layout is a tree of nodes:

- **`row`** — arranges children horizontally; siblings in a row are split by vertical dividers.
- **`column`** — arranges children vertically; siblings in a column are split by horizontal dividers.
- **`stack`** — multiple panels sharing the same area, switched via tabs.
- **`panel`** — leaf node; the actual content the consumer renders.

State is stored as `{ initial, transforms[] }`. The current layout is derived by folding the transforms over the initial tree. `compact()` collapses a state into a fresh baseline. This shape gives free undo/redo, small change deltas for change events, and trivial dehydrate/rehydrate.

## Public API (Phase 1)

```ts
import {
  applyTransform,
  applyTransforms,
  compact,
  dehydrate,
  hydrate,
  type LayoutNode,
  type LayoutState,
  type Transform,
} from '@deephaven/layout';
```
