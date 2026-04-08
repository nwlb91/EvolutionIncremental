import type { Combatant } from "./combat";
import type { MutationInstance } from "./units";
import {
  ENEMY_COUNT,
  ENEMY_BASE_DAMAGE,
  ENEMY_DAMAGE_SCALING,
  ENEMY_BASE_HP,
  ENEMY_HP_SCALING,
  ENEMY_BASE_ATTACK_RATE_MS,
  ENEMY_ATTACK_RATE_DECAY,
  STAT_MAX_DAMAGE,
  STAT_MAX_HP,
  STAT_MIN_ATTACK_RATE_MS,
} from "./balance";
import { tierValueRange } from "./spheres";
import { getMutation } from "./mutations";

export interface EnemyDefinition {
  id: string;
  name: string;
  tier: number; // 0-indexed ladder position
  stats: {
    damage: number;
    hp: number;
    attackRateMs: number;
  };
  mutations: MutationInstance[];
}

/** Create a mutation instance at the midpoint of its tier's value range. */
function mut(mutationId: string, tier: number): MutationInstance {
  const def = getMutation(mutationId);
  const [min, max] = tierValueRange(def.baseRange, tier);
  return { mutationId, tier, value: (min + max) / 2 };
}

/**
 * Mutation loadouts for tiers 11-20 (indices 10-19).
 * Progressively stronger combinations so the player needs mutations to compete.
 */
const MUTATED_ENEMY_LOADOUTS: { name: string; mutations: MutationInstance[] }[] = [
  // Index 10 — one common T1
  { name: "Tough Beast",       mutations: [mut("thick_hide", 1)] },
  // Index 11 — one common T2
  { name: "Quick Beast",       mutations: [mut("quick_twitch", 2)] },
  // Index 12 — two commons T2
  { name: "Hardy Beast",       mutations: [mut("iron_jaw", 2), mut("sharp_claws", 2)] },
  // Index 13 — one rare T1
  { name: "Regen Beast",       mutations: [mut("regeneration", 1)] },
  // Index 14 — one rare T2
  { name: "Berserker Beast",   mutations: [mut("berserk", 2)] },
  // Index 15 — two rares T2
  { name: "Armored Beast",     mutations: [mut("fortify", 2), mut("thick_hide", 2)] },
  // Index 16 — rare T3 + common T3
  { name: "Enduring Beast",    mutations: [mut("regeneration", 3), mut("endurance", 3)] },
  // Index 17 — two rares T3
  { name: "Savage Beast",      mutations: [mut("berserk", 3), mut("sharp_claws", 3)] },
  // Index 18 — legendary T2 + rare T3
  { name: "Apex Beast",        mutations: [mut("apex_predator", 2), mut("fortify", 3)] },
  // Index 19 — legendary T3 + two rares T3
  { name: "Alpha Beast",       mutations: [mut("apex_predator", 3), mut("berserk", 3), mut("regeneration", 3)] },
];

function buildEnemy(tier: number): EnemyDefinition {
  const damage = Math.min(STAT_MAX_DAMAGE, ENEMY_BASE_DAMAGE + tier * ENEMY_DAMAGE_SCALING);
  const hp = Math.min(STAT_MAX_HP, ENEMY_BASE_HP + tier * ENEMY_HP_SCALING);
  const attackRateMs = Math.max(STAT_MIN_ATTACK_RATE_MS, ENEMY_BASE_ATTACK_RATE_MS - tier * ENEMY_ATTACK_RATE_DECAY);

  // Tiers 11-20 (indices 10-19) get mutations
  const loadout = tier >= 10 ? MUTATED_ENEMY_LOADOUTS[tier - 10] : null;

  return {
    id: `enemy_${tier}`,
    name: loadout?.name ?? `Beast Tier ${tier + 1}`,
    tier,
    stats: { damage, hp, attackRateMs },
    mutations: loadout?.mutations ?? [],
  };
}

/** The full enemy ladder, generated once from balance constants. */
export const ENEMY_LADDER: EnemyDefinition[] = Array.from(
  { length: ENEMY_COUNT },
  (_, i) => buildEnemy(i),
);

/** Convert an enemy definition to a Combatant for the combat resolver. */
export function enemyToCombatant(enemy: EnemyDefinition): Combatant {
  return { id: enemy.id, stats: enemy.stats, mutations: enemy.mutations };
}
