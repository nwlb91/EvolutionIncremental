import type { RNG } from "./rng";
import {
  STARTER_DAMAGE,
  STARTER_HP,
  STARTER_ATTACK_RATE_MS,
  STAT_MIN_DAMAGE,
  STAT_MAX_DAMAGE,
  STAT_MIN_HP,
  STAT_MAX_HP,
  STAT_MIN_ATTACK_RATE_MS,
  STAT_MAX_ATTACK_RATE_MS,
} from "./balance";

// ── Core types ──

/** Rarity pool for mutation registry entries. */
export type MutationRarity = "common" | "rare" | "legendary";

/**
 * Registry entry for a mutation definition.
 * Lives in engine/mutations.ts but the type is here to avoid circular deps.
 */
export interface MutationDefinition {
  id: string;
  name: string;
  rarity: MutationRarity;
  /** Base value range [min, max] at tier 1 (e.g. [0.001, 0.01] for 0.1%–1%). */
  baseRange: [number, number];
  /** Optional cap on Sphere tier for this mutation. Default: unlimited. */
  maxTier?: number;
}

/**
 * A concrete mutation instance on a unit.
 * One entry per mutation id — a unit cannot have the same mutation at multiple tiers.
 */
export interface MutationInstance {
  /** References MutationDefinition.id */
  mutationId: string;
  /** Current tier (integer ≥ 1). */
  tier: number;
  /** Current value (within the tier's scaled range). */
  value: number;
}

export interface UnitStats {
  damage: number;
  hp: number;
  attackRateMs: number; // ms between attacks (lower = faster)
}

export interface Unit {
  id: string;
  name: string; // user-editable, defaults to ""
  stats: UnitStats;
  mutations: MutationInstance[];
  parentIds: string[]; // empty for starters / carriers without lineage
}

/**
 * A Sphere is a permanent, reusable collectible that references a mutation.
 * Using a Sphere spawns a carrier unit with that mutation pre-applied.
 */
export interface Sphere {
  /** Unique instance id. */
  id: string;
  /** References MutationDefinition.id */
  mutationId: string;
  /** Tier (integer ≥ 1). Two same-mutation same-tier Spheres can merge → tier+1. */
  tier: number;
}

// ── Factories ──

let _idCounter = 0;

/** Reset counter (useful for deterministic tests). */
export function resetIdCounter(value = 0): void {
  _idCounter = value;
}

export function generateUnitId(): string {
  return `unit_${Date.now()}_${_idCounter++}`;
}

export function clampStats(stats: UnitStats): UnitStats {
  return {
    damage: Math.min(STAT_MAX_DAMAGE, Math.max(STAT_MIN_DAMAGE, stats.damage)),
    hp: Math.min(STAT_MAX_HP, Math.max(STAT_MIN_HP, stats.hp)),
    attackRateMs: Math.min(STAT_MAX_ATTACK_RATE_MS, Math.max(STAT_MIN_ATTACK_RATE_MS, stats.attackRateMs)),
  };
}

export function createStarterUnit(rng: RNG): Unit {
  // Starter has base stats with a tiny bit of variance so first two units differ
  const variance = () => 1 + (rng.next() - 0.5) * 0.1; // ±5%
  return {
    id: generateUnitId(),
    name: "",
    stats: clampStats({
      damage: STARTER_DAMAGE * variance(),
      hp: STARTER_HP * variance(),
      attackRateMs: STARTER_ATTACK_RATE_MS * variance(),
    }),
    mutations: [],
    parentIds: [],
  };
}

/** Format a stat value for display with stat-appropriate precision. */
export function fmtStat(value: number, stat?: keyof UnitStats): string {
  if (stat === "attackRateMs") return Math.round(value).toString();
  if (stat === "hp") return value.toFixed(1).replace(/\.0$/, "");
  // damage: 2 decimal places
  return value.toFixed(2).replace(/\.?0+$/, "");
}

/** Shorthand formatters for specific stats. */
export function fmtDmg(v: number): string { return fmtStat(v, "damage"); }
export function fmtHp(v: number): string { return fmtStat(v, "hp"); }
export function fmtRate(v: number): string { return fmtStat(v, "attackRateMs"); }

export function createUnit(
  id: string,
  stats: UnitStats,
  parentIds: string[] = [],
  name = "",
  mutations: MutationInstance[] = [],
): Unit {
  return { id, name, stats, mutations, parentIds };
}
