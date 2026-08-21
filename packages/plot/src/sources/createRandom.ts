/**
 * Deterministic pseudo random number generator (mulberry32).
 *
 * Demo and test data must be reproducible so e2e screenshot snapshots are
 * stable across runs and machines.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0; // eslint-disable-line no-bitwise
  return function next(): number {
    /* eslint-disable no-bitwise */
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    /* eslint-enable no-bitwise */
  };
}

export default createRandom;
