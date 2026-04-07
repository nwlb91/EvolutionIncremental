/**
 * Seedable PRNG — all game randomness must flow through this.
 * Uses a simple mulberry32 algorithm (fast, deterministic, good distribution).
 */

export interface RNG {
  /** Returns a float in [0, 1) */
  next(): number;
  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Returns the current seed state (for save/restore) */
  state(): number;
}

export function createRNG(seed: number): RNG {
  let s = seed | 0;

  function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function state(): number {
    return s;
  }

  return { next, nextInt, state };
}
