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

/** Mutation slot — designed but no actual mutations yet. */
export interface Mutation {
  id: string;
  name: string;
  description: string;
  /** Which stat(s) it modifies and how — TBD in a future version. */
  effects: Record<string, number>;
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
  mutations: Mutation[];
  parentIds: string[]; // empty for starters / rentals without lineage
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

/** Format a stat value for display — rounds to 2 decimal places, trims trailing zeros. */
export function fmtStat(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function createUnit(
  id: string,
  stats: UnitStats,
  parentIds: string[] = [],
  name = "",
  mutations: Mutation[] = [],
): Unit {
  return { id, name, stats, mutations, parentIds };
}
