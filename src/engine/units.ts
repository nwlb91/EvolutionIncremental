import type { RNG } from "./rng";
import {
  STARTER_DAMAGE,
  STARTER_HP,
  STARTER_ATTACK_RATE_MS,
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

export function createStarterUnit(rng: RNG): Unit {
  // Starter has base stats with a tiny bit of variance so first two units differ
  const variance = () => 1 + (rng.next() - 0.5) * 0.1; // ±5%
  return {
    id: generateUnitId(),
    name: "",
    stats: {
      damage: Math.round(STARTER_DAMAGE * variance()),
      hp: Math.round(STARTER_HP * variance()),
      attackRateMs: Math.round(STARTER_ATTACK_RATE_MS * variance()),
    },
    mutations: [],
    parentIds: [],
  };
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
