import type { Sphere, MutationInstance, Unit } from "./units";
import { generateUnitId } from "./units";
import type { RNG } from "./rng";
import type { MutationRarity } from "./units";
import { getMutation, mutationsByRarity } from "./mutations";
import {
  PROSPECT_BASE_WEIGHT_COMMON,
  PROSPECT_BASE_WEIGHT_RARE,
  PROSPECT_BASE_WEIGHT_LEGENDARY,
  PROSPECT_BUDGET_RARE_SHIFT,
  PROSPECT_RESULT_COUNT_MULTIPLIER,
  PROSPECT_RESULT_COUNT_MIN,
  PROSPECT_RESULT_COUNT_MAX,
  CARRIER_DAMAGE,
  CARRIER_HP,
  CARRIER_ATTACK_RATE_MS,
} from "./balance";

// ── ID generation ──

let _sphereCounter = 0;

export function generateSphereId(): string {
  return `sphere_${Date.now()}_${_sphereCounter++}`;
}

// ── Prospecting ──

/** Compute how many Spheres a prospect at the given budget returns. */
export function prospectResultCount(budget: number): number {
  const raw = 1 + budget * PROSPECT_RESULT_COUNT_MULTIPLIER;
  return Math.min(PROSPECT_RESULT_COUNT_MAX, Math.max(PROSPECT_RESULT_COUNT_MIN, Math.floor(raw)));
}

/**
 * Compute rarity weights for a given budget.
 * Higher budget shifts probability away from common toward rare/legendary.
 */
export function rarityWeights(budget: number): { common: number; rare: number; legendary: number } {
  const shift = budget * PROSPECT_BUDGET_RARE_SHIFT;
  const common = Math.max(0.05, PROSPECT_BASE_WEIGHT_COMMON - shift);
  const removed = PROSPECT_BASE_WEIGHT_COMMON - common;
  // Distribute removed weight: 70% to rare, 30% to legendary
  const rare = PROSPECT_BASE_WEIGHT_RARE + removed * 0.7;
  const legendary = PROSPECT_BASE_WEIGHT_LEGENDARY + removed * 0.3;
  const total = common + rare + legendary;
  return { common: common / total, rare: rare / total, legendary: legendary / total };
}

/** Roll a rarity pool from the weighted distribution. */
function rollRarity(rng: RNG, budget: number): MutationRarity {
  const w = rarityWeights(budget);
  const roll = rng.next();
  if (roll < w.common) return "common";
  if (roll < w.common + w.rare) return "rare";
  return "legendary";
}

/**
 * Run a prospect: spend `budget` money, return an array of new Spheres.
 * Pure function of budget + RNG.
 */
export function prospect(budget: number, rng: RNG): Sphere[] {
  const count = prospectResultCount(budget);
  const results: Sphere[] = [];

  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(rng, budget);
    const pool = mutationsByRarity(rarity);
    if (pool.length === 0) continue; // safety: skip if pool is empty
    const mutation = pool[rng.nextInt(0, pool.length - 1)];
    results.push({
      id: generateSphereId(),
      mutationId: mutation.id,
      tier: 1,
    });
  }

  return results;
}

// ── Using a Sphere (spawn carrier) ──

/**
 * Compute the value range for a mutation at a given tier.
 * Each tier doubles the previous: T1 = base, T2 = 2x, T3 = 4x, etc.
 */
export function tierValueRange(baseRange: [number, number], tier: number): [number, number] {
  const scale = Math.pow(2, tier - 1);
  return [baseRange[0] * scale, baseRange[1] * scale];
}

/**
 * Spawn a carrier unit from a Sphere.
 * Carrier has baseline stats and the Sphere's mutation at the bottom of the tier's value range.
 */
export function spawnCarrier(sphere: Sphere): Unit {
  const mutation = getMutation(sphere.mutationId);
  const [minValue] = tierValueRange(mutation.baseRange, sphere.tier);

  const mutationInstance: MutationInstance = {
    mutationId: sphere.mutationId,
    tier: sphere.tier,
    value: minValue,
  };

  return {
    id: generateUnitId(),
    name: "",
    stats: {
      damage: CARRIER_DAMAGE,
      hp: CARRIER_HP,
      attackRateMs: CARRIER_ATTACK_RATE_MS,
    },
    mutations: [mutationInstance],
    parentIds: [],
  };
}

// ── Merging ──

/**
 * Merge two Spheres of the same mutation and same tier into one at tier+1.
 * Returns the merged Sphere, or null if the merge is invalid.
 */
export function mergeSpheres(a: Sphere, b: Sphere): Sphere | null {
  if (a.mutationId !== b.mutationId) return null;
  if (a.tier !== b.tier) return null;
  if (a.id === b.id) return null;

  // Check maxTier
  const def = getMutation(a.mutationId);
  const nextTier = a.tier + 1;
  if (def.maxTier !== undefined && nextTier > def.maxTier) return null;

  return {
    id: generateSphereId(),
    mutationId: a.mutationId,
    tier: nextTier,
  };
}

export interface MergeOperation {
  sphereIdA: string;
  sphereIdB: string;
  result: Sphere;
}

/**
 * Greedily merge all compatible Sphere pairs.
 * Groups by mutation, then within each mutation sorts by tier and pairs
 * adjacent same-tier Spheres. Repeats until no more merges are possible
 * (so three T1s → one T2 + one leftover T1, then the T2 can't merge alone).
 */
export function mergeAllSpheres(spheres: Record<string, Sphere>): MergeOperation[] {
  // Work on a mutable copy
  const pool = new Map<string, Sphere>();
  for (const s of Object.values(spheres)) pool.set(s.id, { ...s });

  const ops: MergeOperation[] = [];
  let merged = true;

  while (merged) {
    merged = false;

    // Group by mutation
    const byMutation = new Map<string, Sphere[]>();
    for (const s of pool.values()) {
      const list = byMutation.get(s.mutationId) ?? [];
      list.push(s);
      byMutation.set(s.mutationId, list);
    }

    for (const list of byMutation.values()) {
      // Sort by tier ascending so we merge from the bottom up
      list.sort((a, b) => a.tier - b.tier);

      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i];
        const b = list[i + 1];
        if (a.tier !== b.tier) continue;

        const result = mergeSpheres(a, b);
        if (!result) continue;

        ops.push({ sphereIdA: a.id, sphereIdB: b.id, result });
        pool.delete(a.id);
        pool.delete(b.id);
        pool.set(result.id, result);
        merged = true;
        break; // restart grouping since pool changed
      }

      if (merged) break;
    }
  }

  return ops;
}
