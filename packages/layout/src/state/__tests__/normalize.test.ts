import { normalize } from '../normalize';
import { isStack } from '../treeUtils';
import { column, panel, row, stack } from './fixtures';

beforeEach(() => {
  expect.hasAssertions();
});

describe('normalize', () => {
  it('wraps a loose root panel in a stack', () => {
    const result = normalize(panel('p1'));
    expect(isStack(result)).toBe(true);
    if (!isStack(result)) return;
    expect(result.children).toHaveLength(1);
    expect(result.children[0].id).toBe('p1');
    expect(result.activeId).toBe('p1');
  });

  it('wraps loose panels inside row/column children', () => {
    const tree = row('r', [panel('p1'), panel('p2')]);
    const result = normalize(tree);
    expect(result.type).toBe('row');
    if (result.type !== 'row') return;
    expect(result.children).toHaveLength(2);
    expect(result.children[0].type).toBe('stack');
    expect(result.children[1].type).toBe('stack');
  });

  it('drops empty stacks', () => {
    const tree = row('r', [stack('s-empty', []), stack('s', [panel('p1')])]);
    const result = normalize(tree);
    // single-child row collapses to its only child
    expect(result.id).toBe('s');
    expect(result.type).toBe('stack');
  });

  it('collapses a single-child row into its child, inheriting size', () => {
    const tree = row('r', [stack('s', [panel('p1')])], { size: 0.5 });
    const result = normalize(tree);
    expect(result.id).toBe('s');
    expect(result.size).toBe(0.5);
  });

  it('flattens same-axis nested containers', () => {
    const tree = row('outer', [
      row('inner', [stack('s1', [panel('p1')]), stack('s2', [panel('p2')])]),
      stack('s3', [panel('p3')]),
    ]);
    const result = normalize(tree);
    expect(result.type).toBe('row');
    if (result.type !== 'row') return;
    expect(result.children).toHaveLength(3);
    expect(result.children.map(c => c.id)).toEqual(['s1', 's2', 's3']);
  });

  it('does NOT flatten same-axis nested container when child has explicit size', () => {
    const tree = row('outer', [
      row('inner', [stack('s1', [panel('p1')]), stack('s2', [panel('p2')])], {
        size: 0.6,
      }),
      stack('s3', [panel('p3')]),
    ]);
    const result = normalize(tree);
    expect(result.type).toBe('row');
    if (result.type !== 'row') return;
    expect(result.children.map(c => c.id)).toEqual(['inner', 's3']);
  });

  it('preserves perpendicular nesting', () => {
    const tree = row('r', [
      column('c', [stack('s1', [panel('p1')]), stack('s2', [panel('p2')])]),
      stack('s3', [panel('p3')]),
    ]);
    const result = normalize(tree);
    expect(result.type).toBe('row');
  });

  it('fixes up a stack with an invalid activeId', () => {
    const tree = stack('s', [panel('p1'), panel('p2')], { activeId: 'gone' });
    const result = normalize(tree);
    if (!isStack(result)) throw new Error('expected stack');
    expect(result.activeId).toBe('p1');
  });

  it('is idempotent', () => {
    const tree = row('r', [
      panel('p1'),
      column('c', [panel('p2'), panel('p3')]),
    ]);
    const once = normalize(tree);
    const twice = normalize(once);
    expect(twice).toEqual(once);
  });
});
