# Drag & drop

> Source: [../src/dnd/](../src/dnd/). Enabled only when `Dashboard` is in
> `editMode`. Uses native HTML5 drag-and-drop.

## Flow

```
dragstart (a tab) ──▶ DragLayer records active panel + source stack/index
      │                broadcasts panel data for cross-window drag
dragover  ──────────▶ compute hover target (DragContext) + draw indicator
dragend   ──────────▶ hover set?     -> dispatch movePanel(target)
                       outside view?  -> dispatch popoutPanel(geometry)
                       else           -> no-op
```

`DragLayer` ([../src/dnd/DragLayer.tsx](../src/dnd/DragLayer.tsx)) wraps the
dashboard and listens at the **document** level so motion outside the dashboard
(toolbar, viewport edge, beyond) can drive popout-pending state. When `editMode`
is false it is a passthrough.

## Drop zones (`dropZone.ts`)

`computeDropZone(rect, pointer)` is a 5-zone hit test over a target:

- The centered 50% × 50% box → `'center'` (join the stack as a tab).
- Anything outside it → the nearest edge: `'top' | 'right' | 'bottom' | 'left'`
  (split alongside the target).

`computeOuterEdge` detects when the pointer is within a band (`OUTER_BAND_PX`,
currently 24px) of the dashboard's inside edge → a root-level split.
`computeTabInsertIndex` picks the insertion index when hovering a tab strip.

## Hover state (`DragContext`)

`DragContext` describes what a release would do right now:

```ts
type DragHover =
  | { kind: 'stackZone'; stackId; zone: DropZone; insertIndex? }
  | { kind: 'outerEdge'; side };
```

Plus `activePanelId`, `sourceStackId`, and `popoutPending` (true while the
cursor is outside the viewport during a drag). Indicator components read this
context:

- `DropIndicator` — in-window target highlight.
- `OuterEdgeIndicator` — root-level split preview.
- `PopoutPendingIndicator` — full-viewport marching-ants frame shown when the
  cursor leaves the viewport (a release there pops the panel out).

## Hover → `DropTarget`

`buildDropTarget` maps hover to a `DropTarget` (see
[state-and-transforms.md](state-and-transforms.md)):

- `outerEdge` → `{ type: 'rootSibling', side }`.
- `stackZone`, non-center → `{ type: 'sibling', nodeId: stackId, side }`.
- `stackZone`, center → `{ type: 'stack', stackId, index }`, where `index` comes
  from the tab-strip insert position (or appends at the end). When dragging
  within the same stack, the index is adjusted down by one if the source sat
  before the target so the math stays correct after removal.

Decision rules at `dragover`:

- Pointer inside the dashboard → compute `outerEdge` or `stackZone`.
- Pointer outside the dashboard but inside the viewport → no indicator; wait for
  the user to commit.
- Pointer outside the viewport → popout pending.

## Cross-window drag

At `dragstart`, `DragLayer` broadcasts the dragged `PanelNode` (via `getPanel` +
the popout bridge) so another window can accept the drop. Cross-window drops are
routed through popout transforms — see [popouts.md](popouts.md).

## Extending

- New drop geometry → `dropZone.ts` (add unit tests in `dnd/__tests__`).
- New hover kind → extend `DragHover` in `DragContext.tsx`, `buildDropTarget`,
  and the indicator components.
- New indicator → add a component under `dnd/` and render it from `DragLayer`.
- Keep `dropZone.ts` pure (geometry only) so it stays directly testable.
- Update this doc when you add a zone, indicator, or hover kind.
