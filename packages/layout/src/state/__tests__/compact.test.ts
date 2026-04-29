import type { LayoutState, Transform } from '../../types';
import { compact, resolveLayout } from '../compact';
import { applyTransforms } from '../reducer';
import { panel, row, stack } from './fixtures';

beforeEach(() => {
  expect.hasAssertions();
});

describe('compact', () => {
  it('returns the same state if there are no transforms', () => {
    const state: LayoutState = {
      initial: stack('s', [panel('p1')]),
      transforms: [],
    };
    expect(compact(state)).toBe(state);
  });

  it('folds transforms into a fresh baseline', () => {
    const initial = stack('s', [panel('p1')]);
    const transforms: Transform[] = [
      {
        kind: 'addPanel',
        panel: panel('p2'),
        target: { type: 'stack', stackId: 's', index: 1 },
      },
    ];
    const compacted = compact({ initial, transforms });
    expect(compacted.transforms).toEqual([]);
    expect(compacted.initial).toEqual(applyTransforms(initial, transforms));
  });

  it('produces an equivalent layout to applying transforms', () => {
    const initial = row('r', [
      stack('s1', [panel('p1')]),
      stack('s2', [panel('p2')]),
    ]);
    const transforms: Transform[] = [
      {
        kind: 'movePanel',
        panelId: 'p1',
        target: { type: 'stack', stackId: 's2', index: 0 },
      },
      {
        kind: 'addPanel',
        panel: panel('p3'),
        target: { type: 'sibling', nodeId: 's2', side: 'bottom' },
      },
    ];
    const state: LayoutState = { initial, transforms };
    const before = resolveLayout(state);
    const compacted = compact(state);
    const after = resolveLayout(compacted);
    expect(after).toEqual(before);
  });
});
