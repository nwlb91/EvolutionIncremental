import type { Unit, UnitStats } from "./units";
import { generateUnitId } from "./units";
import type { RNG } from "./rng";
import {
  BREEDING_VARIATION_FACTOR,
  BREEDING_DURATION_MS,
  STAT_MIN_DAMAGE,
  STAT_MAX_DAMAGE,
  STAT_MIN_HP,
  STAT_MAX_HP,
  STAT_MIN_ATTACK_RATE_MS,
  STAT_MAX_ATTACK_RATE_MS,
} from "./balance";

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
  const pick = (statA: number, statB: number, min: number, max: number): number => {
    const base = rng.next() < 0.5 ? statA : statB;
    const variation = 1 + (rng.next() * 2 - 1) * BREEDING_VARIATION_FACTOR;
    return Math.round(Math.min(max, Math.max(min, base * variation)));
  };

  return {
    damage: pick(a.damage, b.damage, STAT_MIN_DAMAGE, STAT_MAX_DAMAGE),
    hp: pick(a.hp, b.hp, STAT_MIN_HP, STAT_MAX_HP),
    attackRateMs: pick(a.attackRateMs, b.attackRateMs, STAT_MIN_ATTACK_RATE_MS, STAT_MAX_ATTACK_RATE_MS),
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
