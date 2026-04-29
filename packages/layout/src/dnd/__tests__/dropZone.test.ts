import { computeDropZone, dropIndicatorRect } from '../dropZone';

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
