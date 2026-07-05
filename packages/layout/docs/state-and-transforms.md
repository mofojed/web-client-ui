# State & transforms

> Canonical types: [../src/types.ts](../src/types.ts). Reducer:
> [../src/state/reducer.ts](../src/state/reducer.ts).

## The state shape

```ts
interface LayoutState {
  initial: LayoutNode; // baseline tree
  transforms: Transform[]; // append-only user edits
  popouts?: Record<NodeId, PopoutEntry>; // torn-out windows (optional)
}
```

The **effective** layout is `initial` with every transform folded over it:

```ts
resolveLayout(state); // -> ResolvedState { root, popouts }
applyTransforms(initial, transforms, popouts); // the underlying fold
compact(state); // -> { initial: root, transforms: [], popouts }
```

Why this shape:

- **Undo/redo** is `transforms.slice(0, n)`.
- **Change deltas** are the single appended transform (delivered as the second
  `onChange` arg).
- **Persistence** is just JSON — dehydrate/hydrate walk the tree.
- **Checkpointing**: `compact()` keeps stored payloads small.

Persist with `compact(state)` when the transform list grows large; it is
equivalent to the current tree with an empty transform list.

## Node types

```ts
type LayoutNode = RowNode | ColumnNode | StackNode | PanelNode;
```

- `BaseNode`: `{ id, size?, minSize? }`. `size` is a fractional weight (0..1)
  within the parent container; siblings should sum to ~1. `minSize` is pixels,
  enforced by splitter drags.
- `RowNode` / `ColumnNode`: `{ type, children: LayoutNode[] }`.
- `StackNode`: `{ type: 'stack', children: PanelNode[], activeId? }`. `activeId`
  defaults to the first child.
- `PanelNode`: `{ type: 'panel', component, state?, title? }`. `component` keys
  into the consumer `PanelRegistry`; `state` is opaque, JSON-serializable
  per-panel data; `title` is the default tab label.

## Transforms

Each is a plain, serializable object with a `kind` discriminator. The full union
is in [../src/types.ts](../src/types.ts); the reducer that applies them is in
[../src/state/reducer.ts](../src/state/reducer.ts).

| Kind                   | Payload                                        | Effect                                                                  |
| ---------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `movePanel`            | `panelId`, `target: DropTarget`                | Move an existing panel to a drop target.                                |
| `addPanel`             | `panel: PanelNode`, `target: DropTarget`       | Insert a new panel.                                                     |
| `closePanel`           | `panelId`                                      | Remove a panel (collapsing empty containers).                           |
| `reorderTab`           | `stackId`, `panelId`, `index`                  | Reorder a tab within its stack.                                         |
| `setActive`            | `stackId`, `panelId`                           | Select the active tab.                                                  |
| `setSizes`             | `containerId`, `sizes: Record<NodeId, number>` | Set child weights. Idempotent; coalesced.                               |
| `updatePanelState`     | `panelId`, `state`                             | Replace a panel's opaque state.                                         |
| `popoutPanel`          | `panelId`, `geometry`                          | Tear a panel into a child window.                                       |
| `closePopoutPanel`     | `panelId`                                      | Close a popped-out panel.                                               |
| `updatePopoutGeometry` | `panelId`, `geometry`                          | Track a moved/resized child window.                                     |
| `popoutScope`          | `popoutId`, `inner: Transform`                 | Apply `inner` to one popout's sub-tree. Drops the popout if it empties. |

### `DropTarget`

Where a panel lands. See the doc comment in `types.ts` for why `rootSibling`
resolves the root lazily (the root id can change between hover and apply).

```ts
type DropTarget =
  | { type: 'stack'; stackId; index } // into a stack at a tab index
  | { type: 'sibling'; nodeId; side } // split alongside a node
  | { type: 'container'; containerId; index } // into a row/column at an index
  | { type: 'rootSibling'; side }; // split against the current root
```

## Normalization is the contract

`normalize()` ([../src/state/normalize.ts](../src/state/normalize.ts)) puts a
tree into canonical form and is **idempotent**. It runs on `hydrate()` and after
every transform, so the reducer can assume canonical input.

Canonical form:

- Panels appear only as direct children of stacks (loose panels are auto-wrapped
  in a `stack-${panelId}` stack).
- Stacks have ≥1 panel; rows/columns have ≥1 child.
- A row never directly contains an unsized row; a column never directly contains
  an unsized column (they are flattened).
- A row/column with a single child collapses to that child.
- A stack's `activeId` always references one of its panels.

When adding a transform or node type, make sure the result still normalizes
cleanly, and add any new rule both here and in `normalize.ts`.

## Serialization

```ts
dehydrate(state, { dehydratePanelState }); // runtime -> SerializedLayoutState
hydrate(serialized, { hydratePanelState }); // SerializedLayoutState -> runtime (normalized)
```

The per-panel hooks let consumers strip/restore non-serializable references in
`panel.state` (they receive `(component, state)`). `hydrate()` normalizes the
result, so older serialized states (e.g. without `popouts`) load cleanly.

`SerializedLayoutState` is currently identical to `LayoutState`; keep it that way
unless you introduce a versioned on-disk format (in which case document the
migration here).

## Consuming the loop

The `Dashboard` is controlled. Own the state with a hook:

```ts
const { state, dispatch, setState, reset } = usePersistedLayoutState(initial, {
  key: 'my-app.layout',
});
// dispatch(transform)  -> append one transform
// setState(next)       -> full replacement (after compact/rehydrate)
// reset()              -> back to initial + clear the stored entry
```

`useLayoutState` is the same without persistence. Pass `onChange={setState}` to
`Dashboard`, or handle `onChange(nextState, transform)` yourself.

## Adding a transform (checklist)

1. Add the variant to the `Transform` union in `types.ts`.
2. Handle it in `applyTransform` in `state/reducer.ts` (return a new tree; never
   mutate).
3. Ensure the output re-normalizes cleanly.
4. If it should coalesce, update `components/mergeTransform.ts`.
5. Add unit tests in `state/__tests__`.
6. Update the transform table above.
