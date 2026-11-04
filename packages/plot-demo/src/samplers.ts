import type { Point } from './sources/RollingScatterSource';

/** Approximately normal with a standard deviation of 0.5, which is plenty for demos. */
function gaussian(random: () => number): number {
  return random() + random() + random() - 1.5;
}

/** A gaussian cloud whose center orbits the origin. */
export function orbitingCluster({
  radius,
  speed,
  phase = 0,
  spread = 1,
}: {
  radius: number;
  /** Radians per tick. */
  speed: number;
  phase?: number;
  spread?: number;
}): (time: number, random: () => number, out: Point) => void {
  return (time, random, out) => {
    const angle = phase + time * speed;
    // eslint-disable-next-line no-param-reassign
    out.x = radius * Math.cos(angle) + gaussian(random) * spread;
    // eslint-disable-next-line no-param-reassign
    out.y = radius * Math.sin(angle) + gaussian(random) * spread;
  };
}

/** One arm of a rotating spiral galaxy. */
export function spiralArm({
  angle,
  radius,
  speed,
  twist = 0.55,
  spread = 0.35,
}: {
  angle: number;
  radius: number;
  /** Radians per tick. */
  speed: number;
  twist?: number;
  spread?: number;
}): (time: number, random: () => number, out: Point) => void {
  return (time, random, out) => {
    const r = radius * random() ** 0.7;
    const theta = angle + r * twist - time * speed;
    const jitter = spread * (0.4 + r / radius);
    // eslint-disable-next-line no-param-reassign
    out.x = r * Math.cos(theta) + gaussian(random) * jitter;
    // eslint-disable-next-line no-param-reassign
    out.y = r * Math.sin(theta) + gaussian(random) * jitter;
  };
}

/** Traces a slowly precessing Lissajous figure. */
export function lissajous({
  a,
  b,
  speed,
  drift = 0.01,
}: {
  a: number;
  b: number;
  /** Curve parameter advanced per tick. */
  speed: number;
  /** Phase drift per tick, which makes the figure tumble. */
  drift?: number;
}): (time: number, random: () => number, out: Point) => void {
  return (time, random, out) => {
    const u = time * speed;
    // eslint-disable-next-line no-param-reassign
    out.x = Math.sin(a * u + time * drift) + (random() - 0.5) * 0.02;
    // eslint-disable-next-line no-param-reassign
    out.y = Math.sin(b * u) + (random() - 0.5) * 0.02;
  };
}

/** A random walk. Each call returns a fresh walk with its own state. */
export function randomWalk(
  volatility: number,
  start = 0
): (x: number, random: () => number) => number {
  let value = start;
  return (_x, random) => {
    value += (random() - 0.5) * volatility;
    return value;
  };
}

function bump(
  position: number,
  center: number,
  width: number,
  amplitude: number
): number {
  const distance = (position - center) / width;
  return amplitude * Math.exp(-distance * distance);
}

/** A stylized ECG trace: P wave, QRS complex, and T wave. */
export function heartbeat(
  period: number,
  offset = 0
): (x: number, random: () => number) => number {
  return (x, random) => {
    const p = ((x + offset) % period) / period;
    return (
      bump(p, 0.18, 0.04, 0.12) +
      bump(p, 0.37, 0.012, -0.15) +
      bump(p, 0.4, 0.014, 1.15) +
      bump(p, 0.43, 0.012, -0.3) +
      bump(p, 0.66, 0.06, 0.3) +
      (random() - 0.5) * 0.03
    );
  };
}
