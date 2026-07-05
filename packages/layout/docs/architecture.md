# Architecture

> Audience: agents and contributors changing `@deephaven/layout`. Read this
> first, then the subsystem doc for the area you are touching.

## One-paragraph model

The layout is plain data: an `initial` tree plus an append-only `transforms`
list (and an optional `popouts` map). The visible tree is a pure fold of the
transforms over the baseline. React renders that resolved tree; user actions
produce new transforms, never in-place mutations. `Dashboard` is fully
controlled — it holds no layout state of its own.

```
                 dispatch(transform)
   user action ──────────────────────▶ onChange(nextState, transform)
                                             │  (consumer stores it)
                                             ▼
        layout prop ─────────────────▶ resolveLayout() ─▶ resolved tree ─▶ React render
```

## Module map (`src/`)

### `state/` — pure, framework-free logic (no React, no DOM)

| File           | Responsibility                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `reducer.ts`   | `applyTransform` / `applyTransforms`: fold one/many transforms → `ResolvedState { root, popouts }`. The heart of the package. |
| `compact.ts`   | `resolveLayout` (derive current tree) and `compact` (fold transforms into a fresh baseline).                                  |
| `normalize.ts` | `normalize` (canonicalize a tree) and `makeId`. Idempotent. Every boundary runs it.                                           |
| `hydrate.ts`   | `dehydrate` / `hydrate`: serialize ↔ runtime, with per-panel-state hooks.                                                    |
| `treeUtils.ts` | `findNode`, `findParent`, `replaceNode`, `removeNode`, `iterPanels`, `isPanel`/`isStack`/`isContainer`.                       |

### `components/` — React rendering

| File                                  | Responsibility                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Dashboard.tsx`                       | The public component. Resolves state, owns panel hosts, wires context, dispatches transforms via `onChange`.        |
| `RenderNode.tsx`                      | Switch on node type → `Row` / `Column` / `Stack`.                                                                   |
| `Row.tsx` / `Column.tsx`              | Flex containers with `Splitter`s between children.                                                                  |
| `Stack.tsx`                           | Tab strip + active-panel slot.                                                                                      |
| `Panel.tsx` / `PanelContentMount.tsx` | The persistent-host portal model (see [components.md](components.md)).                                              |
| `Splitter.tsx` / `splitterMath.ts`    | Resize handles; convert drags to `setSizes` transforms.                                                             |
| `LayoutContext.tsx`                   | Internal context (`state`, `dispatch`, `components`, `editMode`, `focusedPanelId`, `getPanelHost`). Never exported. |
| `createLayoutState.ts`                | Public helper: normalize a tree into a `LayoutState`.                                                               |
| `mergeTransform.ts`                   | Append a transform, coalescing consecutive `setSizes` for the same container.                                       |
| `findFocusedPanelId.ts`               | Map `document.activeElement` to the enclosing panel id.                                                             |

### `dnd/` — drag-and-drop

| File                                                                          | Responsibility                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `DragContext.tsx`                                                             | Context describing the in-progress drag (active panel, hover target, popout-pending). |
| `DragLayer.tsx`                                                               | Owns the HTML5 drag lifecycle; turns a drop into a transform.                         |
| `dropZone.ts`                                                                 | Geometry: `computeDropZone` (5-zone hit test) and outer-edge detection.               |
| `DropIndicator.tsx` / `OuterEdgeIndicator.tsx` / `PopoutPendingIndicator.tsx` | Visual feedback overlays.                                                             |
| `htmlDrag.ts`                                                                 | Native drag helpers.                                                                  |

### `hooks/` — consumer state helpers

| File                         | Responsibility                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `useLayoutState.ts`          | Local controlled-state loop (`state` + `dispatch` + `setState`).                          |
| `usePersistedLayoutState.ts` | Same, backed by `Storage` (localStorage/sessionStorage) with hydrate/dehydrate + `reset`. |

### `popout/` — cross-window panels

| File                   | Responsibility                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `PopoutController.tsx` | Parent-side: opens child windows, heartbeats, reconciles, routes cross-window transforms. |
| `PopoutPanelHost.tsx`  | Child-window entry: renders a single popped-out panel and syncs back to the parent.       |
| `PopoutBridge.ts`      | `BroadcastChannel` wrapper for parent↔child messaging.                                   |
| `openPopoutWindow.ts`  | Opens the chromeless child window (must run in a user gesture).                           |
| `popoutQuery.ts`       | Query-param contract (`parsePopoutParams`, `POPOUT_PARAM`, `POPOUT_LAYOUT_KEY_PARAM`).    |

## Layering rules

- `components/`, `dnd/`, `hooks/`, `popout/` may depend on `state/`.
- `state/` depends on nothing in this package except `types.ts` and other
  `state/` files. Keep it pure so it stays unit-testable and reusable.
- Only `types.ts` and `index.ts` are the public boundary. Anything not
  re-exported from `index.ts` is internal and may change freely.
- Follow the monorepo rule in [AGENTS.md](../../../AGENTS.md): do not import
  this package's own `@deephaven/layout` alias — use relative paths.

## Invariants

Every change must preserve these. If you add one, document it here.

1. **`Dashboard` is controlled.** It never sets its own layout state; all
   changes flow out through `onChange` and back in through `layout`.
2. **Canonical tree.** After `normalize()` (run at hydrate and after every
   transform): panels live only inside stacks; stacks have ≥1 panel;
   rows/columns have ≥1 child and are collapsed when they have exactly one;
   same-axis unsized containers are flattened; a stack's `activeId` always
   references one of its panels. The reducer assumes canonical input.
3. **Transforms are append-only and serializable.** They are plain JSON
   objects; never store functions or class instances in them or in
   `panel.state`.
4. **`setSizes` is idempotent** and consecutive same-container `setSizes` are
   coalesced (see `mergeTransform.ts`). Keep it that way.
5. **Panel content persists across rearrangement** via per-panel host DOM
   nodes + portals (see [components.md](components.md)). Do not move panel
   content by re-parenting React subtrees.
6. **Ids are stable.** A panel keeps its id across moves; the reducer/normalize
   derive container ids deterministically (e.g. `stack-${panelId}` for
   auto-wrapped stacks).

## Where to make a change

| Task                   | Primary file(s)                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------- |
| New transform behavior | `state/reducer.ts` (+ `types.ts` `Transform` union)                                 |
| New node type          | `types.ts`, `state/normalize.ts`, `state/treeUtils.ts`, `components/RenderNode.tsx` |
| New tree invariant     | `state/normalize.ts` (+ this doc's Invariants)                                      |
| Rendering / styling    | `components/*.tsx`, `components/Layout.scss`                                        |
| Drag/drop behavior     | `dnd/*`                                                                             |
| Persistence            | `hooks/usePersistedLayoutState.ts`, `state/hydrate.ts`                              |
| Popouts                | `popout/*`                                                                          |

## Related docs

- [state-and-transforms.md](state-and-transforms.md)
- [components.md](components.md)
- [drag-and-drop.md](drag-and-drop.md)
- [popouts.md](popouts.md)
- [testing.md](testing.md)
