import type { Transform } from '../../types';
import mergeTransform from '../mergeTransform';

beforeEach(() => {
  expect.hasAssertions();
});

describe('mergeTransform', () => {
  it('appends a non-setSizes transform', () => {
    const list: Transform[] = [];
    const next: Transform = { kind: 'closePanel', panelId: 'p1' };
    expect(mergeTransform(list, next)).toEqual([next]);
  });

  it('appends setSizes after a non-setSizes transform', () => {
    const list: Transform[] = [{ kind: 'closePanel', panelId: 'p1' }];
    const next: Transform = {
      kind: 'setSizes',
      containerId: 'r',
      sizes: { s1: 0.6 },
    };
    expect(mergeTransform(list, next)).toHaveLength(2);
  });

  it('coalesces consecutive setSizes for the same container', () => {
    const list: Transform[] = [
      {
        kind: 'setSizes',
        containerId: 'r',
        sizes: { s1: 0.6, s2: 0.4 },
      },
    ];
    const next: Transform = {
      kind: 'setSizes',
      containerId: 'r',
      sizes: { s1: 0.7, s2: 0.3 },
    };
    const result = mergeTransform(list, next);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      kind: 'setSizes',
      containerId: 'r',
      sizes: { s1: 0.7, s2: 0.3 },
    });
  });

  it('does NOT coalesce setSizes for different containers', () => {
    const list: Transform[] = [
      {
        kind: 'setSizes',
        containerId: 'r1',
        sizes: { s1: 0.5 },
      },
    ];
    const next: Transform = {
      kind: 'setSizes',
      containerId: 'r2',
      sizes: { s1: 0.5 },
    };
    expect(mergeTransform(list, next)).toHaveLength(2);
  });

  it('preserves untouched sibling sizes from the previous transform', () => {
    const list: Transform[] = [
      {
        kind: 'setSizes',
        containerId: 'r',
        sizes: { s1: 0.3, s2: 0.3, s3: 0.4 },
      },
    ];
    const next: Transform = {
      kind: 'setSizes',
      containerId: 'r',
      sizes: { s1: 0.4, s2: 0.2 },
    };
    const result = mergeTransform(list, next) as Extract<
      Transform,
      { kind: 'setSizes' }
    >[];
    expect(result[0].sizes).toEqual({ s1: 0.4, s2: 0.2, s3: 0.4 });
  });

  it('coalesces consecutive setMaximized toggles to the latest', () => {
    const list: Transform[] = [{ kind: 'setMaximized', panelId: 'p1' }];
    const next: Transform = { kind: 'setMaximized', panelId: null };
    const result = mergeTransform(list, next);
    expect(result).toEqual([next]);
  });
});
