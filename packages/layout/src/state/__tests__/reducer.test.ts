import type { LayoutNode, Transform } from '../../types';
import { applyTransform, applyTransforms } from '../reducer';
import { findNode, isStack, iterPanels } from '../treeUtils';
import { panel, row, stack } from './fixtures';

beforeEach(() => {
  expect.hasAssertions();
});

function panelIds(root: LayoutNode): string[] {
  return [...iterPanels(root)].map(p => p.id);
}

describe('closePanel', () => {
  it('removes the panel and collapses its stack if empty', () => {
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2'), panel('p3')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'closePanel',
      panelId: 'p1',
    });
    // s1 becomes empty → dropped → row has 1 child → collapses to s2
    expect(result.id).toBe('s2');
    expect(panelIds(result)).toEqual(['p2', 'p3']);
  });

  it('is a no-op for an unknown panel id', () => {
    const tree = stack('s', [panel('p1')]);
    const result = applyTransform(tree, {
      kind: 'closePanel',
      panelId: 'nope',
    });
    expect(panelIds(result)).toEqual(['p1']);
  });
});

describe('reorderTab', () => {
  it('moves a panel within a stack', () => {
    const tree = stack('s', [panel('p1'), panel('p2'), panel('p3')]);
    const result = applyTransform(tree, {
      kind: 'reorderTab',
      stackId: 's',
      panelId: 'p1',
      index: 2,
    });
    if (!isStack(result)) throw new Error('expected stack');
    expect(result.children.map(c => c.id)).toEqual(['p2', 'p3', 'p1']);
  });

  it('clamps out-of-bounds index', () => {
    const tree = stack('s', [panel('p1'), panel('p2')]);
    const result = applyTransform(tree, {
      kind: 'reorderTab',
      stackId: 's',
      panelId: 'p1',
      index: 99,
    });
    if (!isStack(result)) throw new Error('expected stack');
    expect(result.children.map(c => c.id)).toEqual(['p2', 'p1']);
  });

  it('is a no-op if the panel is not in the stack', () => {
    const tree = stack('s', [panel('p1')]);
    const result = applyTransform(tree, {
      kind: 'reorderTab',
      stackId: 's',
      panelId: 'nope',
      index: 0,
    });
    expect(result).toEqual(tree);
  });
});

describe('setActive', () => {
  it('sets the active tab', () => {
    const tree = stack('s', [panel('p1'), panel('p2')], { activeId: 'p1' });
    const result = applyTransform(tree, {
      kind: 'setActive',
      stackId: 's',
      panelId: 'p2',
    });
    if (!isStack(result)) throw new Error('expected stack');
    expect(result.activeId).toBe('p2');
  });

  it('ignores an invalid panelId', () => {
    const tree = stack('s', [panel('p1')], { activeId: 'p1' });
    const result = applyTransform(tree, {
      kind: 'setActive',
      stackId: 's',
      panelId: 'nope',
    });
    if (!isStack(result)) throw new Error('expected stack');
    expect(result.activeId).toBe('p1');
  });
});

describe('setSizes', () => {
  it('writes sizes to matching children', () => {
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'setSizes',
      containerId: 'r',
      sizes: { s1: 0.3, s2: 0.7 },
    });
    if (result.type !== 'row') throw new Error('expected row');
    expect(result.children[0].size).toBe(0.3);
    expect(result.children[1].size).toBe(0.7);
  });

  it('is a no-op on a stack', () => {
    const tree = stack('s', [panel('p1'), panel('p2')]);
    const result = applyTransform(tree, {
      kind: 'setSizes',
      containerId: 's',
      sizes: { p1: 0.1 },
    });
    expect(result).toEqual(tree);
  });
});

describe('updatePanelState', () => {
  it('replaces the panel state', () => {
    const tree = stack('s', [panel('p1', { state: { foo: 1 } })]);
    const result = applyTransform(tree, {
      kind: 'updatePanelState',
      panelId: 'p1',
      state: { foo: 2 },
    });
    const found = findNode(result, 'p1');
    expect(found?.type).toBe('panel');
    if (found?.type !== 'panel') return;
    expect(found.state).toEqual({ foo: 2 });
  });
});

describe('addPanel', () => {
  it('adds to an existing stack and updates active', () => {
    const tree = stack('s', [panel('p1')], { activeId: 'p1' });
    const result = applyTransform(tree, {
      kind: 'addPanel',
      panel: panel('p2'),
      target: { type: 'stack', stackId: 's', index: 1 },
    });
    if (!isStack(result)) throw new Error('expected stack');
    expect(result.children.map(c => c.id)).toEqual(['p1', 'p2']);
    expect(result.activeId).toBe('p2');
  });

  it('inserts into a row at the given index, wrapping in a stack', () => {
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'addPanel',
      panel: panel('p3'),
      target: { type: 'container', containerId: 'r', index: 1 },
    });
    if (result.type !== 'row') throw new Error('expected row');
    expect(result.children.map(c => c.id)).toEqual(['s1', 'stack-p3', 's2']);
  });

  it('splits a sibling on the right (same-axis insert)', () => {
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'addPanel',
      panel: panel('p3'),
      target: { type: 'sibling', nodeId: 's1', side: 'right' },
    });
    if (result.type !== 'row') throw new Error('expected row');
    expect(result.children.map(c => c.id)).toEqual(['s1', 'stack-p3', 's2']);
  });

  it('splits a sibling on the bottom (perpendicular wrap)', () => {
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'addPanel',
      panel: panel('p3'),
      target: { type: 'sibling', nodeId: 's1', side: 'bottom' },
    });
    if (result.type !== 'row') throw new Error('expected row');
    // s1 wrapped in a column: [s1, stack-p3]
    const wrapped = result.children[0];
    expect(wrapped.type).toBe('column');
    if (wrapped.type !== 'column') return;
    expect(wrapped.children.map(c => c.id)).toEqual(['s1', 'stack-p3']);
  });

  it('splits the root', () => {
    const tree = stack('s', [panel('p1')]);
    const result = applyTransform(tree, {
      kind: 'addPanel',
      panel: panel('p2'),
      target: { type: 'sibling', nodeId: 's', side: 'right' },
    });
    expect(result.type).toBe('row');
    if (result.type !== 'row') return;
    expect(result.children.map(c => c.id)).toEqual(['s', 'stack-p2']);
  });
});

describe('movePanel', () => {
  it('moves a panel from one stack to another', () => {
    const tree = row('r', [
      stack('s1', [panel('p1'), panel('p2')]),
      stack('s2', [panel('p3')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'movePanel',
      panelId: 'p1',
      target: { type: 'stack', stackId: 's2', index: 0 },
    });
    if (result.type !== 'row') throw new Error('expected row');
    const s1 = result.children.find(c => c.id === 's1');
    const s2 = result.children.find(c => c.id === 's2');
    if (!s1 || s1.type !== 'stack') throw new Error('s1 missing');
    if (!s2 || s2.type !== 'stack') throw new Error('s2 missing');
    expect(s1.children.map(c => c.id)).toEqual(['p2']);
    expect(s2.children.map(c => c.id)).toEqual(['p1', 'p3']);
  });

  it('collapses an empty source stack after move', () => {
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'movePanel',
      panelId: 'p1',
      target: { type: 'stack', stackId: 's2', index: 0 },
    });
    expect(result.id).toBe('s2');
    expect(panelIds(result)).toEqual(['p1', 'p2']);
  });

  it('is a no-op when dropping a panel adjacent to itself', () => {
    const tree = stack('s', [panel('p1')]);
    const result = applyTransform(tree, {
      kind: 'movePanel',
      panelId: 'p1',
      target: { type: 'sibling', nodeId: 'p1', side: 'right' },
    });
    expect(result).toEqual(tree);
  });

  it('is a no-op for a stale panel id', () => {
    const tree = stack('s', [panel('p1')]);
    const result = applyTransform(tree, {
      kind: 'movePanel',
      panelId: 'nope',
      target: { type: 'stack', stackId: 's', index: 0 },
    });
    expect(result).toEqual(tree);
  });

  it('is a no-op when target stack has been collapsed away by removal', () => {
    // s2 is sole child of column c2; moving p2 out of s2 collapses c2 → s2 → empty
    // target referencing s2 should resolve to no-op (panel is restored? no — return root)
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'movePanel',
      panelId: 'p2',
      target: { type: 'stack', stackId: 's2', index: 0 },
    });
    // s2 vanishes after removal; transform aborts → original tree
    expect(result).toEqual(tree);
  });
});

describe('rootSibling target', () => {
  it('splits the current root regardless of its id', () => {
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransform(tree, {
      kind: 'movePanel',
      panelId: 'p1',
      target: { type: 'rootSibling', side: 'bottom' },
    });
    expect(result.type).toBe('column');
    if (result.type !== 'column') return;
    expect(panelIds(result).sort()).toEqual(['p1', 'p2']);
  });

  it('handles consecutive root-sibling moves of the same panel', () => {
    // initial: row [s1, s2]
    // step 1: drag p1 to bottom of root → column [stack(s2), stack-p1]
    //   (s1 collapsed away when p1 was removed; original row collapsed
    //    to just stack(s2); then wrap with stack-p1 below)
    // step 2: drag p1 to right of root → row [stack(s2), stack-p1]
    //   (the column from step 1 collapses when p1 is removed, leaving
    //    just stack(s2); rootSibling resolves to that as the new root)
    const tree = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const afterFirst = applyTransform(tree, {
      kind: 'movePanel',
      panelId: 'p1',
      target: { type: 'rootSibling', side: 'bottom' },
    });
    expect(afterFirst.type).toBe('column');
    const afterSecond = applyTransform(afterFirst, {
      kind: 'movePanel',
      panelId: 'p1',
      target: { type: 'rootSibling', side: 'right' },
    });
    expect(afterSecond.type).toBe('row');
    if (afterSecond.type !== 'row') return;
    expect(panelIds(afterSecond).sort()).toEqual(['p1', 'p2']);
  });
});

describe('applyTransforms', () => {
  it('applies a sequence in order', () => {
    const initial = stack('s', [panel('p1')]);
    const transforms: Transform[] = [
      {
        kind: 'addPanel',
        panel: panel('p2'),
        target: { type: 'stack', stackId: 's', index: 1 },
      },
      {
        kind: 'addPanel',
        panel: panel('p3'),
        target: { type: 'sibling', nodeId: 's', side: 'right' },
      },
      { kind: 'closePanel', panelId: 'p2' },
    ];
    const result = applyTransforms(initial, transforms);
    expect(panelIds(result).sort()).toEqual(['p1', 'p3']);
    expect(result.type).toBe('row');
  });

  it('normalizes the initial tree before applying', () => {
    // initial has a loose panel in a row
    const initial = row('r', [panel('p1'), panel('p2')]);
    const result = applyTransforms(initial, []);
    if (result.type !== 'row') throw new Error('expected row');
    expect(result.children.every(c => c.type === 'stack')).toBe(true);
  });
});

describe('popout transforms', () => {
  const geom = { screenX: 100, screenY: 200, width: 800, height: 600 };

  function popoutPanelIds(
    result: { popouts: Record<string, { layout: LayoutNode }> },
    popoutId: string
  ): string[] {
    const layout = result.popouts[popoutId]?.layout;
    return layout != null ? [...iterPanels(layout)].map(p => p.id) : [];
  }

  it('popoutPanel removes the panel from the tree and adds a single-panel layout to popouts', () => {
    const initial = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransforms(
      initial,
      [{ kind: 'popoutPanel', panelId: 'p1', geometry: geom }],
      {}
    );
    expect(panelIds(result.root)).toEqual(['p2']);
    expect(popoutPanelIds(result, 'p1')).toEqual(['p1']);
    expect(result.popouts.p1?.geometry).toEqual(geom);
  });

  it('popoutPanel is a no-op for an unknown panel id', () => {
    const initial = stack('s', [panel('p1')]);
    const result = applyTransforms(
      initial,
      [{ kind: 'popoutPanel', panelId: 'nope', geometry: geom }],
      {}
    );
    expect(panelIds(result.root)).toEqual(['p1']);
    expect(result.popouts).toEqual({});
  });

  it('closePopoutPanel drops the entry without restoring the panel', () => {
    const initial = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const result = applyTransforms(
      initial,
      [
        { kind: 'popoutPanel', panelId: 'p1', geometry: geom },
        { kind: 'closePopoutPanel', panelId: 'p1' },
      ],
      {}
    );
    expect(panelIds(result.root)).toEqual(['p2']);
    expect(result.popouts).toEqual({});
  });

  it('updatePopoutGeometry updates the entry geometry', () => {
    const initial = stack('s', [panel('p1'), panel('p2')]);
    const next = { screenX: 500, screenY: 500, width: 400, height: 300 };
    const result = applyTransforms(
      initial,
      [
        { kind: 'popoutPanel', panelId: 'p1', geometry: geom },
        { kind: 'updatePopoutGeometry', panelId: 'p1', geometry: next },
      ],
      {}
    );
    expect(result.popouts.p1?.geometry).toEqual(next);
  });

  it('updatePanelState mirrors into the popout layout when the panel is popped out', () => {
    const initial = stack('s', [panel('p1'), panel('p2')]);
    const result = applyTransforms(
      initial,
      [
        { kind: 'popoutPanel', panelId: 'p1', geometry: geom },
        { kind: 'updatePanelState', panelId: 'p1', state: { foo: 1 } },
      ],
      {}
    );
    const popped = findNode(result.popouts.p1!.layout, 'p1');
    expect(popped?.type).toBe('panel');
    if (popped?.type !== 'panel') return;
    expect(popped.state).toEqual({ foo: 1 });
  });

  it('closePanel on a popped-out panel drops both tree and popout entry', () => {
    const initial = stack('s', [panel('p1'), panel('p2')]);
    const result = applyTransforms(
      initial,
      [
        { kind: 'popoutPanel', panelId: 'p1', geometry: geom },
        { kind: 'closePanel', panelId: 'p1' },
      ],
      {}
    );
    expect(panelIds(result.root)).toEqual(['p2']);
    expect(result.popouts).toEqual({});
  });

  it('popoutScope applies an inner transform to the popout layout', () => {
    const initial = stack('s', [panel('p1'), panel('p2')]);
    const result = applyTransforms(
      initial,
      [
        { kind: 'popoutPanel', panelId: 'p1', geometry: geom },
        {
          kind: 'popoutScope',
          popoutId: 'p1',
          inner: {
            kind: 'addPanel',
            panel: panel('p3'),
            target: { type: 'rootSibling', side: 'right' },
          },
        },
      ],
      {}
    );
    expect(popoutPanelIds(result, 'p1').sort()).toEqual(['p1', 'p3']);
  });

  it('popoutScope drops the popout entry when its layout becomes empty', () => {
    const initial = stack('s', [panel('p1'), panel('p2')]);
    const result = applyTransforms(
      initial,
      [
        { kind: 'popoutPanel', panelId: 'p1', geometry: geom },
        {
          kind: 'popoutScope',
          popoutId: 'p1',
          inner: { kind: 'closePanel', panelId: 'p1' },
        },
      ],
      {}
    );
    expect(result.popouts).toEqual({});
  });
});
