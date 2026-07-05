# Popouts (cross-window panels)

> Source: [../src/popout/](../src/popout/). Opt-in: pass a `layoutKey` to
> `Dashboard`. Passing `null`/undefined disables popouts entirely.

## Concept

A panel can be torn out of the dashboard into its own chromeless browser
window. The child window reloads the same SPA bundle with private query params,
reads the parent's shared layout state, and renders just that one panel. Parent
and children stay in sync over a `BroadcastChannel` named after the layout key.

Popped-out panels live on `LayoutState.popouts` (a `Record<NodeId,
PopoutEntry>`), separate from the visible tree. Each `PopoutEntry` holds the
popout's own layout sub-tree (initially a single-panel stack; it can grow if the
user drags more panels in) plus the child window `geometry`.

## Roles

| Piece                                                                                         | Role                                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `PopoutController` ([../src/popout/PopoutController.tsx](../src/popout/PopoutController.tsx)) | Parent-side. Opens windows, heartbeats, reconciles live popouts on mount, routes cross-window transforms. Provides `usePopoutController()`. |
| `PopoutPanelHost` ([../src/popout/PopoutPanelHost.tsx](../src/popout/PopoutPanelHost.tsx))    | Child-window entry point. Renders the single popped-out panel in its own `Dashboard` and syncs back to the parent.                          |
| `PopoutBridge` ([../src/popout/PopoutBridge.ts](../src/popout/PopoutBridge.ts))               | `BroadcastChannel` wrapper. No-ops when `BroadcastChannel` is unavailable (SSR/old browsers).                                               |
| `openPopoutWindow` ([../src/popout/openPopoutWindow.ts](../src/popout/openPopoutWindow.ts))   | Opens the chromeless window. **Must run in a user gesture** (e.g. `dragend`) or the browser downgrades it to a tab.                         |
| `popoutQuery` ([../src/popout/popoutQuery.ts](../src/popout/popoutQuery.ts))                  | Query-param contract.                                                                                                                       |

## Wiring (consumer)

```tsx
// Parent app
<Dashboard
  layout={state}
  components={COMPONENTS}
  onChange={setState}
  editMode
  layoutKey="my-app.layout"
/>;

// Bootstrap: detect a popout window and render the host instead of the app
const params = parsePopoutParams(window.location.search);
if (params != null) {
  return (
    <PopoutPanelHost components={COMPONENTS} /* hydrateOptions, storage */ />
  );
}
```

`parsePopoutParams` returns `null` for the parent window, or
`{ panelId, layoutKey }` for a popout. The params:

- `POPOUT_PARAM` (`__deephaven-popout`) — the panel id the child renders.
- `POPOUT_LAYOUT_KEY_PARAM` (`__deephaven-layout-key`) — the storage key/channel
  name to subscribe to.

## Transforms

Popout state changes flow through the same transform pipeline (see
[state-and-transforms.md](state-and-transforms.md)):

- `popoutPanel` / `closePopoutPanel` / `updatePopoutGeometry` — manage entries.
- `popoutScope { popoutId, inner }` — apply `inner` to one popout's sub-tree.
  Used both locally (a popout's own `Dashboard` dispatches `movePanel`, wrapped
  as `popoutScope`) and across windows (a popout broadcasts a transform, the
  parent applies the scoped version). If `inner` empties the popout, the entry
  is dropped automatically.

## Messaging (`PopoutBridge`)

The parent is authoritative; children sync to it. Message types (see the union
in `PopoutBridge.ts`):

| Message                                                    | Direction         | Purpose                                                                                                                           |
| ---------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `state`                                                    | parent → children | Broadcast the master serialized state.                                                                                            |
| `panelState`                                               | either            | Update one panel's opaque state.                                                                                                  |
| `transform`                                                | popout → parent   | Ask the parent to apply a transform on master state.                                                                              |
| `closePopout`                                              | either            | Close a popped-out panel.                                                                                                         |
| `updateGeometry`                                           | popout → parent   | Report the child window's moved/resized geometry.                                                                                 |
| `heartbeat`                                                | parent → popouts  | Liveness ping; extended silence ⇒ parent gone ⇒ popout self-closes after a grace period (so a brief parent refresh is invisible). |
| `discoverPopouts`                                          | parent → popouts  | On parent mount: "identify yourselves" so a refreshed parent avoids re-opening live popouts.                                      |
| `popoutAlive`                                              | popout → parent   | Response to `discoverPopouts` / sent on mount.                                                                                    |
| `crossDragStart` / `crossDragComplete` / `crossDragCancel` | source ↔ dest    | Cross-window panel drag handshake (announce, confirm accept, cancel).                                                             |

`windowId` on `Dashboard`/context identifies the window in this topology
(`null` = parent). Cross-window drag uses it to route messages and choose which
transform variant to dispatch on drop.

## Reconciliation & liveness

- On mount the parent waits briefly (`FIRST_RECONCILE_DELAY_MS`) for
  `popoutAlive` replies before reconciling, so it re-adopts still-open windows
  instead of re-opening (and reloading) them.
- The parent heartbeats on an interval; a child that hears silence past
  `PARENT_SILENCE_TIMEOUT_MS` assumes the parent is truly gone and closes.

## Gotchas

- `openPopoutWindow` must be called synchronously from a user-gesture handler.
- Everything crossing the channel is serialized — keep `panel.state` JSON-safe
  and use `dehydrate`/`hydrate` hooks for non-serializable references.
- Popouts require `BroadcastChannel`; without it the bridge no-ops and popouts
  are effectively disabled.

## Extending

- New cross-window message → add to the `PopoutMessage` union in
  `PopoutBridge.ts`, handle it in `PopoutController` and/or `PopoutPanelHost`,
  and document it in the table above.
- New popout transform → see the transform checklist in
  [state-and-transforms.md](state-and-transforms.md).
- New query param → `popoutQuery.ts` (and export it from `index.ts` if public).
