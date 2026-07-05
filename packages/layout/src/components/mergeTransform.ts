import type { Transform } from '../types';

/**
 * Append `next` to `transforms`, coalescing consecutive `setSizes` calls for
 * the same container, and consecutive `setMaximized` toggles. Splitter drags
 * dispatch one transform per pointermove; without coalescing the transforms
 * list grows unboundedly. Coalescing is safe because `setSizes` is idempotent
 * and `setMaximized` only cares about the latest value.
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
  // Consecutive maximize toggles collapse to the latest — only the final
  // maximized panel matters, so intermediate toggles are pure noise.
  if (
    last !== undefined &&
    last.kind === 'setMaximized' &&
    next.kind === 'setMaximized'
  ) {
    return [...transforms.slice(0, -1), next];
  }
  return [...transforms, next];
}
