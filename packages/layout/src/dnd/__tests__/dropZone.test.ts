import {
  computeDropZone,
  computeOuterEdge,
  computeTabInsertIndex,
  dropIndicatorRect,
} from '../dropZone';

beforeEach(() => {
  expect.hasAssertions();
});

const RECT = { left: 100, top: 100, width: 200, height: 200 };

describe('computeDropZone', () => {
  it('returns center for the middle 50% × 50% region', () => {
    expect(computeDropZone(RECT, { x: 200, y: 200 })).toBe('center');
    expect(computeDropZone(RECT, { x: 160, y: 160 })).toBe('center');
    expect(computeDropZone(RECT, { x: 240, y: 240 })).toBe('center');
  });

  it('returns left near the left edge', () => {
    expect(computeDropZone(RECT, { x: 110, y: 200 })).toBe('left');
  });

  it('returns right near the right edge', () => {
    expect(computeDropZone(RECT, { x: 290, y: 200 })).toBe('right');
  });

  it('returns top near the top edge', () => {
    expect(computeDropZone(RECT, { x: 200, y: 110 })).toBe('top');
  });

  it('returns bottom near the bottom edge', () => {
    expect(computeDropZone(RECT, { x: 200, y: 290 })).toBe('bottom');
  });

  it('returns center on a degenerate rect', () => {
    expect(
      computeDropZone({ left: 0, top: 0, width: 0, height: 0 }, { x: 0, y: 0 })
    ).toBe('center');
  });
});

describe('computeOuterEdge', () => {
  const DASH = { left: 0, top: 0, width: 1000, height: 800 };

  it('returns null when the pointer is far outside the dashboard', () => {
    expect(computeOuterEdge(DASH, { x: -100, y: 100 }, 16)).toBeNull();
    expect(computeOuterEdge(DASH, { x: 100, y: -100 }, 16)).toBeNull();
    expect(computeOuterEdge(DASH, { x: 1100, y: 100 }, 16)).toBeNull();
    expect(computeOuterEdge(DASH, { x: 100, y: 900 }, 16)).toBeNull();
  });

  it('triggers when the pointer is just outside the dashboard within band', () => {
    expect(computeOuterEdge(DASH, { x: -5, y: 400 }, 16)).toBe('left');
    expect(computeOuterEdge(DASH, { x: 1005, y: 400 }, 16)).toBe('right');
    expect(computeOuterEdge(DASH, { x: 500, y: -5 }, 16)).toBe('top');
    expect(computeOuterEdge(DASH, { x: 500, y: 805 }, 16)).toBe('bottom');
  });

  it('returns null when the pointer is far from any edge', () => {
    expect(computeOuterEdge(DASH, { x: 500, y: 400 }, 16)).toBeNull();
  });

  it('returns left for a pointer near the left edge', () => {
    expect(computeOuterEdge(DASH, { x: 5, y: 400 }, 16)).toBe('left');
  });

  it('returns right for a pointer near the right edge', () => {
    expect(computeOuterEdge(DASH, { x: 995, y: 400 }, 16)).toBe('right');
  });

  it('returns top for a pointer near the top edge', () => {
    expect(computeOuterEdge(DASH, { x: 500, y: 5 }, 16)).toBe('top');
  });

  it('returns bottom for a pointer near the bottom edge', () => {
    expect(computeOuterEdge(DASH, { x: 500, y: 795 }, 16)).toBe('bottom');
  });

  it('respects the band width', () => {
    expect(computeOuterEdge(DASH, { x: 50, y: 400 }, 16)).toBeNull();
    expect(computeOuterEdge(DASH, { x: 50, y: 400 }, 100)).toBe('left');
  });
});

describe('computeTabInsertIndex', () => {
  const TABS = [
    { left: 0, right: 100 },
    { left: 100, right: 200 },
    { left: 200, right: 300 },
  ];

  it('returns 0 when before the first tab midpoint', () => {
    expect(computeTabInsertIndex(TABS, 10)).toBe(0);
    expect(computeTabInsertIndex(TABS, 49)).toBe(0);
  });

  it('returns the index of the next tab when past a midpoint', () => {
    expect(computeTabInsertIndex(TABS, 51)).toBe(1);
    expect(computeTabInsertIndex(TABS, 151)).toBe(2);
  });

  it('returns tabs.length when past the last midpoint', () => {
    expect(computeTabInsertIndex(TABS, 251)).toBe(3);
    expect(computeTabInsertIndex(TABS, 9999)).toBe(3);
  });

  it('returns 0 for an empty tab list', () => {
    expect(computeTabInsertIndex([], 100)).toBe(0);
  });
});

describe('dropIndicatorRect', () => {
  it('covers the full rect for center', () => {
    expect(dropIndicatorRect('center')).toEqual({
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
    });
  });

  it('covers the top half for top', () => {
    expect(dropIndicatorRect('top')).toEqual({
      top: '0',
      left: '0',
      right: '0',
      bottom: '50%',
    });
  });

  it('covers the right half for right', () => {
    expect(dropIndicatorRect('right')).toEqual({
      top: '0',
      left: '50%',
      right: '0',
      bottom: '0',
    });
  });
});
