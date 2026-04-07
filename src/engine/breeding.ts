import type { Unit, UnitStats } from "./units";
import { generateUnitId } from "./units";
import type { RNG } from "./rng";
import { BREEDING_VARIATION_FACTOR, BREEDING_DURATION_MS } from "./balance";

export interface BreedingOperation {
  parentA: string; // unit id
  parentB: string; // unit id
  startedAt: number; // timestamp ms
  durationMs: number;
}

export interface BreedingResult {
  child: Unit;
}

/**
 * Determine the child's stats from two parents.
 * Each stat is independently inherited from one parent (50/50),
 * then multiplicative noise is applied.
 */
export function breedStats(a: UnitStats, b: UnitStats, rng: RNG): UnitStats {
  const pick = (statA: number, statB: number): number => {
    const base = rng.next() < 0.5 ? statA : statB;
    const variation = 1 + (rng.next() * 2 - 1) * BREEDING_VARIATION_FACTOR;
    return Math.max(1, Math.round(base * variation));
  };

  return {
    damage: pick(a.damage, b.damage),
    hp: pick(a.hp, b.hp),
    attackRateMs: pick(a.attackRateMs, b.attackRateMs),
  };
}

/**
 * Start a breeding operation (returns the operation metadata).
 * The caller (state reducer) is responsible for enforcing concurrency limits.
 */
export function startBreeding(parentA: string, parentB: string, now: number): BreedingOperation {
  return {
    parentA,
    parentB,
    startedAt: now,
    durationMs: BREEDING_DURATION_MS,
  };
}

/** Check if the breeding operation is complete. */
export function isBreedingComplete(op: BreedingOperation, now: number): boolean {
  return now >= op.startedAt + op.durationMs;
}

/**
 * Resolve a completed breeding operation into a child unit.
 * Requires the actual parent Unit objects so stats can be inherited.
 */
export function resolveBreeding(
  parentA: Unit,
  parentB: Unit,
  rng: RNG,
): BreedingResult {
  const childStats = breedStats(parentA.stats, parentB.stats, rng);
  return {
    child: {
      id: generateUnitId(),
      name: "",
      stats: childStats,
      mutations: [],
      parentIds: [parentA.id, parentB.id],
    },
  };
}
