# Components & rendering

> Source: [../src/components/](../src/components/). Public component:
> `Dashboard`. Public types: `PanelContentProps`, `PanelDefinition`,
> `PanelRegistry`, `TabRenderProps`.

## `Dashboard`

The single component consumers render. It is **controlled**: it resolves the
`layout` prop, renders the tree, and emits changes via `onChange` — it never
holds layout state itself.

Key props ([../src/components/Dashboard.tsx](../src/components/Dashboard.tsx)):

| Prop                          | Purpose                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `layout: LayoutState`         | Current state. `Dashboard` resolves it with `resolveLayout`.                                                                              |
| `components: PanelRegistry`   | Map of `component` name → `PanelDefinition`.                                                                                              |
| `onChange?(state, transform)` | Fired on every user-driven change.                                                                                                        |
| `editMode?`                   | When true: all stacks show tab strips and tabs are draggable. When false: single-panel stacks are chromeless and the layout is read-only. |
| `layoutKey?`                  | Storage key shared with popout child windows. `null`/undefined disables popouts.                                                          |
| `windowId?`                   | Popout topology id. `null` = parent window. Set automatically by `PopoutPanelHost`.                                                       |
| `className?` / `style?`       | Applied to the root element.                                                                                                              |

A `Dashboard` rendered inside another `Dashboard`'s panel detects nesting via
`LayoutContext` and adds the `is-nested` class for a visual border.

## The panel registry

Consumers describe each panel component once:

```ts
interface PanelDefinition {
  component: ComponentType<PanelContentProps>;
  renderTab?: (props: TabRenderProps) => ReactNode; // custom tab label
  renderTabTooltip?: (props: TabRenderProps) => ReactNode; // tab tooltip
  isClosable?: boolean; // default true
}
type PanelRegistry = Record<string, PanelDefinition>;
```

A `PanelNode.component` string keys into this registry. Content components
receive `PanelContentProps`:

```ts
interface PanelContentProps {
  panel: PanelNode; // includes the panel's opaque `state`
  isActive: boolean; // visible tab in its stack
  editMode: boolean;
  setState: (state: unknown) => void; // dispatches `updatePanelState`
}
```

Use `setState` for panel-local, serializable state so it round-trips through
dehydrate/hydrate.

## Rendering pipeline

```
Dashboard
  resolveLayout(layout) -> resolved.root
  RenderNode(root)
    ├─ 'row'    -> Row     (flex row  + Splitters)
    ├─ 'column' -> Column  (flex col  + Splitters)
    └─ 'stack'  -> Stack   (tab strip + active slot)
```

`RenderNode` switches on node type. Panels are never rendered inline by
`RenderNode`; if it defensively encounters a loose panel it wraps it in a
synthetic stack. Panel _content_ is mounted separately (below).

## The persistent portal-host model

This is the most important and subtle part of the package — read it before
touching `Panel.tsx` / `PanelContentMount.tsx` / `Stack.tsx`.

Problem: when a panel moves between stacks (or a stack re-renders), a naive
React tree would unmount and remount the panel's content, losing DOM state,
scroll position, focus, iframes, and grid virtualization.

Solution: each panel gets a **persistent host `<div>`** created on first request
and kept for the panel's lifetime (`getPanelHost(panelId)` on `LayoutContext`,
backed by a `Map` in `Dashboard`).

- `Dashboard` renders one `PanelContentMount` per visible panel that **portals**
  the consumer's content component into that panel's host div. This subtree
  stays mounted regardless of where the panel sits in the tree.
- The panel's **slot** in the rendered tree (inside `Stack`/`Panel`) appends the
  same host div as a child via a ref. Moving the panel just re-parents the host
  div in the DOM; the React subtree portaled into it never unmounts.

Lifecycle:

- Hosts for panels that leave the visible tree (closed, popped out, moved into a
  nested dashboard) are removed and dropped from the map via an effect keyed on
  the visible-panel set.
- On `Dashboard` unmount, all hosts are removed.

Rule: **never move panel content by re-parenting React subtrees.** Route it
through the host/portal mechanism so identity is preserved.

## Focus tracking

`Dashboard` listens for `focusin`/`focusout` and maps the active element to the
enclosing panel id via `findFocusedPanelId`, exposing `focusedPanelId` on
`LayoutContext`. Focus inside a _nested_ `Dashboard` does not mark the outer host
panel as focused (each dashboard computes relative to its own tree).

## Splitters & sizing

`Splitter` renders between container children. Drags are converted (via
`splitterMath.ts`, respecting each node's `minSize`) into `setSizes` transforms.
Because splitter drags fire once per `pointermove`, `mergeTransform` coalesces
consecutive same-container `setSizes` so the transform list stays bounded.

## `LayoutContext` (internal)

Never exported. Carries `state`, `dispatch`, `components`, `editMode`,
`focusedPanelId`, and `getPanelHost` to descendants. Add new cross-cutting
rendering state here rather than threading props, and document the addition in
[architecture.md](architecture.md).

## Styling

Component styles live in `components/Layout.scss`. Follow the repo UI/UX rules
(`.github/instructions/ui-ux.instructions.md`): use theme tokens / color
variables rather than hard-coded colors.
