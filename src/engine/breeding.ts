import type { Unit, UnitStats, MutationInstance } from "./units";
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
  MUTATION_SINGLE_PARENT_PROBABILITY,
  MUTATION_BOTH_PARENTS_PROBABILITY,
} from "./balance";
import { getMutation } from "./mutations";
import { tierValueRange } from "./spheres";

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
export function breedStats(a: UnitStats, b: UnitStats, rng: RNG, variationFactor = BREEDING_VARIATION_FACTOR): UnitStats {
  const pick = (statA: number, statB: number, min: number, max: number): number => {
    const base = rng.next() < 0.5 ? statA : statB;
    const variation = 1 + (rng.next() * 2 - 1) * variationFactor;
    return Math.min(max, Math.max(min, base * variation));
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
 * Inherit mutations from two parents following recessive inheritance rules.
 *
 * - If only one parent has a mutation: low probability child inherits it.
 * - If both parents have it: high probability child inherits it.
 * - When inherited from one parent (or both at same tier): child gets that tier,
 *   value ± standard variation.
 * - When inherited from two parents at different tiers: 50/50 which parent's
 *   tier+value to inherit from, then variation applied. Downgrades are possible.
 * - One tier per mutation per unit (enforced by keying on mutationId).
 */
export function inheritMutations(
  parentA: Unit,
  parentB: Unit,
  rng: RNG,
  variationFactor: number = BREEDING_VARIATION_FACTOR,
): MutationInstance[] {
  // Build lookup maps: mutationId → MutationInstance
  const aMap = new Map<string, MutationInstance>();
  for (const m of parentA.mutations) aMap.set(m.mutationId, m);
  const bMap = new Map<string, MutationInstance>();
  for (const m of parentB.mutations) bMap.set(m.mutationId, m);

  // Collect all unique mutation ids across both parents
  const allIds = new Set([...aMap.keys(), ...bMap.keys()]);
  const childMutations: MutationInstance[] = [];

  for (const mutId of allIds) {
    const fromA = aMap.get(mutId);
    const fromB = bMap.get(mutId);
    const bothHave = !!fromA && !!fromB;

    // Determine inheritance probability
    const prob = bothHave ? MUTATION_BOTH_PARENTS_PROBABILITY : MUTATION_SINGLE_PARENT_PROBABILITY;
    if (rng.next() >= prob) continue; // not inherited

    // Determine which parent(s) to inherit from
    let sourceTier: number;
    let sourceValue: number;

    if (bothHave) {
      if (fromA.tier === fromB.tier) {
        // Same tier: inherit that tier, pick one parent's value randomly
        sourceTier = fromA.tier;
        sourceValue = rng.next() < 0.5 ? fromA.value : fromB.value;
      } else {
        // Different tiers: 50/50 which parent's tier+value
        const picked = rng.next() < 0.5 ? fromA : fromB;
        sourceTier = picked.tier;
        sourceValue = picked.value;
      }
    } else {
      // Only one parent has it
      const source = fromA ?? fromB!;
      sourceTier = source.tier;
      sourceValue = source.value;
    }

    // Apply variation (same as stat variation: multiplicative noise)
    const variation = 1 + (rng.next() * 2 - 1) * variationFactor;
    let childValue = sourceValue * variation;

    // Clamp to the tier's value range
    const def = getMutation(mutId);
    const [minVal, maxVal] = tierValueRange(def.baseRange, sourceTier);
    childValue = Math.min(maxVal, Math.max(minVal, childValue));

    childMutations.push({
      mutationId: mutId,
      tier: sourceTier,
      value: childValue,
    });
  }

  return childMutations;
}

/**
 * Resolve a completed breeding operation into a child unit.
 * Requires the actual parent Unit objects so stats can be inherited.
 */
export function resolveBreeding(
  parentA: Unit,
  parentB: Unit,
  rng: RNG,
  variationFactor?: number,
): BreedingResult {
  const vf = variationFactor ?? BREEDING_VARIATION_FACTOR;
  const childStats = breedStats(parentA.stats, parentB.stats, rng, vf);
  const childMutations = inheritMutations(parentA, parentB, rng, vf);
  return {
    child: {
      id: generateUnitId(),
      name: "",
      stats: childStats,
      mutations: childMutations,
      parentIds: [parentA.id, parentB.id],
    },
  };
}
