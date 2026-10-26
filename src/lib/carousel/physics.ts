/**
 * Motion and layout for the ring carousel. Pure functions, so the feel (coasting, magnetic snap) is testable.
 *
 * Position `p` is measured in tiles: tile `i` is centred when `p === i` (modulo the tile count).
 */
export interface Motion {
  p: number;
  /** Tiles per second. */
  v: number;
  /** Set once the ring is slow enough to be pulled onto a tile; kept until the user grabs it again. */
  target?: number;
}

/** Coasting slows by this much per second (exponential), so a flick spins for a couple of seconds. */
export const FRICTION = 1.1;
/** Below this speed the nearest tile takes over and pulls the ring in like a magnet. */
export const SNAP_SPEED = 1.5;
export const SPRING_K = 70;
export const SPRING_C = 2 * Math.sqrt(SPRING_K) * 0.85; // slightly under critical: settles with a tiny, soft overshoot
export const MAX_SPEED = 18;
/** How far ahead of its current position a slowing ring looks when choosing the tile to land on. */
const LEAD_SECONDS = 0.12;
const SUBSTEP = 1 / 240;

export const clampSpeed = (v: number) => Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v));

/** Wraps a distance in tiles into (-n/2, n/2]. */
export function wrap(d: number, n: number): number {
  const m = (((d + n / 2) % n) + n) % n;
  return m - n / 2 === -n / 2 ? n / 2 : m - n / 2;
}

/** Index (0..n-1) of the tile nearest the centre. */
export function nearestIndex(p: number, n: number): number {
  return ((Math.round(p) % n) + n) % n;
}

/** The tile the ring will lock onto if left alone. */
export function snapTarget(p: number, v: number): number {
  return Math.round(p + v * LEAD_SECONDS);
}

/** A motion that pulls the ring to tile `index` by the shortest way round. */
export function motionTo(m: Motion, index: number, n: number): Motion {
  return { p: m.p, v: 0, target: Math.round(m.p + wrap(index - m.p, n)) };
}

/** Advances the motion by `dt` seconds. `settled` is true once the ring rests exactly on a tile. */
export function stepMotion(m: Motion, dt: number): Motion & { settled: boolean } {
  let { p, v, target } = m;
  let left = Math.min(Math.max(dt, 0), 0.05); // a stalled frame must not fling the ring
  while (left > 1e-9) {
    const h = Math.min(left, SUBSTEP);
    left -= h;
    if (target === undefined && Math.abs(v) > SNAP_SPEED) {
      v *= Math.exp(-FRICTION * h);
    } else {
      target ??= snapTarget(p, v); // latch, so the choice cannot flip back and forth while settling
      v += (SPRING_K * (target - p) - SPRING_C * v) * h;
    }
    p += v * h;
  }
  if (target !== undefined && Math.abs(target - p) < 0.0005 && Math.abs(v) < 0.01) {
    return { p: target, v: 0, target, settled: true };
  }
  return { p, v, target, settled: false };
}

export interface RingGeometry {
  /** Ring radius in px. */
  radius: number;
  /** How far the back of the ring sits above the front, in px (the ring is seen from slightly above). */
  rise: number;
  /** Extra room, in px, opened up beside the centre tile so the big tile does not cover its neighbours. */
  push: number;
}

export interface TileTransform {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** Degrees; tiles angle in toward the viewer. */
  rotateY: number;
  zIndex: number;
  /** 1 at the front, 0 at the back. */
  front: number;
}

/** Where tile `i` sits on the ring: centre tile largest and in front, back tiles smaller and dimmer. */
export function tileTransform(i: number, p: number, n: number, geo: RingGeometry): TileTransform {
  const d = wrap(i - p, n);
  const theta = (d * 2 * Math.PI) / n;
  const front = (1 + Math.cos(theta)) / 2;
  // Only the centre tile and its two neighbours are large; the rest stay small however many tiles there are.
  const near = Math.exp(-(d * d) / 0.9);
  return {
    x: geo.radius * Math.sin(theta) + Math.sign(d) * geo.push * (1 - Math.exp(-(d * d) / 1.5)),
    y: -(1 - front) * geo.rise,
    scale: 0.55 + 0.75 * near,
    opacity: 0.55 + 0.45 * front,
    rotateY: -Math.sin(theta) * 24,
    zIndex: Math.round(front * 100),
    front,
  };
}
