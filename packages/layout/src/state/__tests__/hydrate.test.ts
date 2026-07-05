import type { LayoutState, Transform } from '../../types';
import { dehydrate, hydrate } from '../hydrate';
import { iterPanels } from '../treeUtils';
import { panel, row, stack } from './fixtures';

beforeEach(() => {
  expect.hasAssertions();
});

describe('dehydrate / hydrate', () => {
  it('round-trips a state through JSON without options', () => {
    const state: LayoutState = {
      initial: row('r', [
        stack('s1', [panel('p1', { state: { v: 1 } })]),
        stack('s2', [panel('p2')]),
      ]),
      transforms: [
        {
          kind: 'addPanel',
          panel: panel('p3'),
          target: { type: 'stack', stackId: 's1', index: 0 },
        },
      ],
    };
    const json = JSON.stringify(dehydrate(state));
    const round = hydrate(JSON.parse(json));
    expect(round).toEqual(state);
  });

  it('round-trips the maximized panel id', () => {
    const state: LayoutState = {
      initial: stack('s', [panel('p1'), panel('p2')]),
      transforms: [],
      maximizedId: 'p2',
    };
    const json = JSON.stringify(dehydrate(state));
    const round = hydrate(JSON.parse(json));
    expect(round.maximizedId).toBe('p2');
  });

  it('applies dehydratePanelState to every panel in initial and transforms', () => {
    const fn = jest.fn(
      (component: string, s: unknown) =>
        ({ component, marker: 'dehydrated', original: s }) as unknown
    );
    const state: LayoutState = {
      initial: stack('s', [panel('p1', { state: { v: 1 } })]),
      transforms: [
        {
          kind: 'addPanel',
          panel: panel('p2', { state: { v: 2 } }),
          target: { type: 'stack', stackId: 's', index: 1 },
        },
      ],
    };
    const out = dehydrate(state, { dehydratePanelState: fn });
    expect(fn).toHaveBeenCalledTimes(2);
    const initialPanels = [...iterPanels(out.initial)];
    expect(initialPanels[0].state).toMatchObject({ marker: 'dehydrated' });
    const t = out.transforms[0] as Extract<Transform, { kind: 'addPanel' }>;
    expect(t.panel.state).toMatchObject({ marker: 'dehydrated' });
  });

  it('hydrate normalizes a loose initial tree', () => {
    const serialized: LayoutState = {
      initial: row('r', [panel('p1'), panel('p2')]),
      transforms: [],
    };
    const result = hydrate(serialized);
    if (result.initial.type !== 'row') throw new Error('expected row');
    expect(result.initial.children.every(c => c.type === 'stack')).toBe(true);
  });

  it('applies hydratePanelState during hydrate', () => {
    const fn = jest.fn((_component: string, s: unknown) => ({
      hydrated: true,
      original: s,
    }));
    const serialized: LayoutState = {
      initial: stack('s', [panel('p1', { state: { v: 1 } })]),
      transforms: [],
    };
    const result = hydrate(serialized, { hydratePanelState: fn });
    expect(fn).toHaveBeenCalledTimes(1);
    const p = [...iterPanels(result.initial)][0];
    expect(p.state).toEqual({ hydrated: true, original: { v: 1 } });
  });
});
