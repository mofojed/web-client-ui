import { computeSplitterSizes, type SplitterDragState } from '../splitterMath';

beforeEach(() => {
  expect.hasAssertions();
});

const baseDrag: SplitterDragState = {
  startCoord: 500,
  parentSize: 1000,
  prevPixel: 500,
  nextPixel: 500,
  initialFractions: { p1: 0.5, p2: 0.5 },
  prevId: 'p1',
  nextId: 'p2',
  prevMinSize: 100,
  nextMinSize: 100,
};

describe('computeSplitterSizes', () => {
  it('redistributes sizes when the splitter moves right', () => {
    const result = computeSplitterSizes(baseDrag, 600);
    expect(result.prevPixel).toBe(600);
    expect(result.nextPixel).toBe(400);
    expect(result.fractions.p1).toBeCloseTo(0.6);
    expect(result.fractions.p2).toBeCloseTo(0.4);
  });

  it('redistributes sizes when the splitter moves left', () => {
    const result = computeSplitterSizes(baseDrag, 400);
    expect(result.prevPixel).toBe(400);
    expect(result.nextPixel).toBe(600);
  });

  it('clamps the prev sibling to its minSize', () => {
    const result = computeSplitterSizes(baseDrag, 100);
    expect(result.prevPixel).toBe(100);
    expect(result.nextPixel).toBe(900);
  });

  it('clamps the next sibling to its minSize', () => {
    const result = computeSplitterSizes(baseDrag, 1000);
    expect(result.nextPixel).toBe(100);
    expect(result.prevPixel).toBe(900);
  });

  it('keeps untouched siblings at their captured fractions', () => {
    const drag: SplitterDragState = {
      ...baseDrag,
      parentSize: 900,
      prevPixel: 300,
      nextPixel: 300,
      initialFractions: { p1: 0.333, p2: 0.333, p3: 0.334 },
    };
    const result = computeSplitterSizes(drag, 600);
    expect(result.fractions.p3).toBeCloseTo(0.334);
  });
});
