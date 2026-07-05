# @deephaven/layout

A React-native panel layout system: rows, columns, tabbed stacks, splitters,
drag-and-drop rearrangement, and cross-window popouts. Intended as the eventual
replacement for `@deephaven/golden-layout`.

Unlike `golden-layout`, this package is data-first: the layout is a plain,
JSON-serializable tree plus an append-only list of transforms. Rendering is a
pure function of that state, which gives free undo/redo, small change deltas,
and trivial dehydrate/rehydrate.

## When to use this package

- You want a panel/tab dashboard rendered by React with no imperative
  layout-manager API.
- You need serializable layout state you can persist and restore yourself.
- You need panels to survive rearrangement without unmounting (see the portal
  host model in [docs/components.md](docs/components.md)).

If you are working inside the legacy stack (`dashboard`,
`dashboard-core-plugins`, golden-layout panels), that is a different system —
see `@deephaven/golden-layout` instead.

## Quick start

```tsx
import {
  Dashboard,
  createLayoutState,
  usePersistedLayoutState,
  type PanelContentProps,
  type PanelRegistry,
} from '@deephaven/layout';

function Hello({ panel }: PanelContentProps): JSX.Element {
  return <div>Hello from {panel.id}</div>;
}

const COMPONENTS: PanelRegistry = {
  hello: { component: Hello },
};

const INITIAL = createLayoutState({
  type: 'stack',
  id: 'root',
  children: [{ type: 'panel', id: 'p1', component: 'hello', title: 'Hello' }],
});

function App(): JSX.Element {
  const { state, setState } = usePersistedLayoutState(INITIAL, {
    key: 'my-app.layout',
  });

  return (
    <Dashboard
      layout={state}
      components={COMPONENTS}
      onChange={setState}
      editMode
    />
  );
}
```

`Dashboard` is controlled: it never mutates state internally. Every user action
calls `onChange(nextState, transform)`, and you feed the new state back in via
the `layout` prop. Use `useLayoutState` / `usePersistedLayoutState` to own that
loop, or manage it yourself.

## Core model in one screen

A layout is a tree of four node kinds:

- **`row`** — arranges children horizontally (vertical dividers between them).
- **`column`** — arranges children vertically (horizontal dividers between them).
- **`stack`** — panels sharing one area, switched via tabs.
- **`panel`** — leaf; names a `component` in your registry and carries opaque,
  serializable `state`.

State is `{ initial, transforms[], popouts? }`. The visible tree is derived by
folding `transforms` over `initial`:

```ts
resolveLayout(state); // -> { root, popouts }   effective tree
compact(state); // -> folds transforms into a fresh baseline
```

Full type reference lives in [src/types.ts](src/types.ts).

## Public API surface

Everything importable from `@deephaven/layout` is re-exported in
[src/index.ts](src/index.ts). The high-value entry points:

| Export                                                                         | Purpose                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------- |
| `Dashboard`                                                                    | The one component consumers render.                 |
| `createLayoutState`                                                            | Normalize a tree into an initial `LayoutState`.     |
| `useLayoutState` / `usePersistedLayoutState`                                   | Own the controlled state loop.                      |
| `applyTransform` / `applyTransforms` / `compact` / `resolveLayout`             | Pure state folding.                                 |
| `dehydrate` / `hydrate`                                                        | Serialize / restore, with per-panel-state hooks.    |
| `normalize`, `makeId`                                                          | Canonicalize a tree, mint ids.                      |
| `findNode`, `findParent`, `iterPanels`, `isPanel`/`isStack`/`isContainer`      | Tree helpers.                                       |
| `PopoutPanelHost`, `PopoutController`, `openPopoutWindow`, `parsePopoutParams` | Cross-window popouts.                               |
| `MaximizeProvider`, `MaximizeBreadcrumb`, `useMaximizeChain`                   | Maximize-a-panel + cross-dashboard zoom breadcrumb. |

## Documentation

Deep-dive docs are split by subsystem. Start with architecture, then read the
area you are touching.

- [docs/architecture.md](docs/architecture.md) — module map, data flow, and the
  invariants every change must preserve.
- [docs/state-and-transforms.md](docs/state-and-transforms.md) — the state
  shape, every transform, normalization, compaction, and persistence.
- [docs/components.md](docs/components.md) — `Dashboard`, the panel registry,
  the persistent portal-host model, and rendering.
- [docs/drag-and-drop.md](docs/drag-and-drop.md) — drop zones, indicators, and
  how a drag becomes a transform.
- [docs/popouts.md](docs/popouts.md) — tearing panels into child windows and
  cross-window state sync.
- [docs/testing.md](docs/testing.md) — how this package is tested and the
  patterns to follow.

## Package conventions

- Pure logic (`src/state/**`) stays framework-free and side-effect-free so it
  can be unit-tested directly and reused server-side.
- Normalization is the contract: the reducer assumes canonical input, so run
  `normalize()` at every boundary (hydrate, and after each transform).
- Follow the repo-wide rules in [AGENTS.md](../../AGENTS.md) and
  `.github/instructions/*`: no direct `@adobe/react-spectrum` imports, no
  importing this package's own `@deephaven/layout` alias (use relative paths),
  Conventional Commit PR titles.

## Keeping these docs current

**These docs are load-bearing for agents. Update them in the same change that
adds or alters behavior — treat stale docs as a bug.**

- New node type, transform kind, or `LayoutState` field →
  [docs/state-and-transforms.md](docs/state-and-transforms.md) and the type
  table above.
- New public export → [src/index.ts](src/index.ts) and the API table above.
- New component, hook, or context → [docs/architecture.md](docs/architecture.md)
  and [docs/components.md](docs/components.md).
- New drag/drop behavior or indicator → [docs/drag-and-drop.md](docs/drag-and-drop.md).
- New popout/cross-window message or param → [docs/popouts.md](docs/popouts.md).
- New invariant → the "Invariants" section of
  [docs/architecture.md](docs/architecture.md).

When in doubt, prefer a one-line note in the right doc over silence.
