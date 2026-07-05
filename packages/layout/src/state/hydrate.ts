import type {
  DehydrateOptions,
  HydrateOptions,
  LayoutNode,
  LayoutState,
  NodeId,
  PanelNode,
  PopoutEntry,
  SerializedLayoutState,
  Transform,
} from '../types';
import { isContainer, isPanel } from './treeUtils';
import { normalize } from './normalize';

function transformPanels(
  node: LayoutNode,
  transform: (panel: PanelNode) => PanelNode
): LayoutNode {
  if (isPanel(node)) return transform(node);
  if (!isContainer(node)) return node;
  let changed = false;
  const next = node.children.map(c => {
    const r = transformPanels(c, transform);
    if (r !== c) changed = true;
    return r;
  });
  if (!changed) return node;
  return { ...node, children: next as never };
}

function transformPanelsInTransforms(
  transforms: Transform[],
  transform: (panel: PanelNode) => PanelNode
): Transform[] {
  return transforms.map(t => {
    if (t.kind === 'addPanel') {
      return { ...t, panel: transform(t.panel) };
    }
    return t;
  });
}

function mapPopouts(
  popouts: Record<NodeId, PopoutEntry> | undefined,
  transform: (panel: PanelNode) => PanelNode
): Record<NodeId, PopoutEntry> | undefined {
  if (popouts == null) return popouts;
  return Object.fromEntries(
    Object.entries(popouts).map(([id, entry]) => [
      id,
      { ...entry, layout: transformPanels(entry.layout, transform) },
    ])
  );
}

/**
 * Convert a runtime state into a serializable form. Optionally lets the
 * caller transform each panel's `state` before serialization (e.g. to strip
 * non-serializable references).
 */
export function dehydrate(
  state: LayoutState,
  options?: DehydrateOptions
): SerializedLayoutState {
  const fn = options?.dehydratePanelState;
  if (!fn) {
    return {
      initial: state.initial,
      transforms: state.transforms,
      popouts: state.popouts,
      maximizedId: state.maximizedId,
    };
  }
  const mapPanel = (p: PanelNode): PanelNode => ({
    ...p,
    state: fn(p.component, p.state),
  });
  return {
    initial: transformPanels(state.initial, mapPanel),
    transforms: transformPanelsInTransforms(state.transforms, mapPanel),
    popouts: mapPopouts(state.popouts, mapPanel),
    maximizedId: state.maximizedId,
  };
}

/**
 * Convert a serialized state back into runtime form. Runs `normalize()` so
 * downstream code can rely on canonical-form invariants.
 */
export function hydrate(
  serialized: SerializedLayoutState,
  options?: HydrateOptions
): LayoutState {
  const fn = options?.hydratePanelState;
  let { initial, transforms, popouts } = serialized;
  if (fn) {
    const mapPanel = (p: PanelNode): PanelNode => ({
      ...p,
      state: fn(p.component, p.state),
    });
    initial = transformPanels(initial, mapPanel);
    transforms = transformPanelsInTransforms(transforms, mapPanel);
    popouts = mapPopouts(popouts, mapPanel);
  }
  return {
    initial: normalize(initial),
    transforms,
    popouts,
    maximizedId: serialized.maximizedId,
  };
}
