import type { Transform } from '../types';

/**
 * Append `next` to `transforms`, coalescing consecutive `setSizes` calls for
 * the same container. Splitter drags dispatch one transform per pointermove;
 * without coalescing the transforms list grows unboundedly. Coalescing is
 * safe because `setSizes` is idempotent — applying the latest is equivalent
 * to applying all the intermediate ones in sequence.
 */
export default function mergeTransform(
  transforms: Transform[],
  next: Transform
): Transform[] {
  const last = transforms[transforms.length - 1];
  if (
    last !== undefined &&
    last.kind === 'setSizes' &&
    next.kind === 'setSizes' &&
    last.containerId === next.containerId
  ) {
    const merged: Transform = {
      kind: 'setSizes',
      containerId: next.containerId,
      sizes: { ...last.sizes, ...next.sizes },
    };
    return [...transforms.slice(0, -1), merged];
  }
  return [...transforms, next];
}
