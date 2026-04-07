import type { Unit, UnitStats } from "./units";
import { generateUnitId, clampStats } from "./units";
import type { RNG } from "./rng";
import {
  RENTAL_STAT_BUDGET_MULTIPLIER,
  STARTER_DAMAGE,
  STARTER_HP,
  STARTER_ATTACK_RATE_MS,
} from "./balance";

export interface Rental {
  unit: Unit;
  /** True = this unit is rented, not owned. Affects cost calculations. */
  isRental: true;
}

export interface RentalSearchParams {
  budget: number; // money spent on quality
  resultCount: number; // how many rentals to generate
}

/**
 * Generate rental units based on search parameters.
 * Higher budget → better stats. Pure function of params + RNG.
 */
export function generateRentals(params: RentalSearchParams, rng: RNG): Rental[] {
  const results: Rental[] = [];
  const qualityMultiplier = 1 + params.budget * RENTAL_STAT_BUDGET_MULTIPLIER / 100;

  for (let i = 0; i < params.resultCount; i++) {
    const variance = () => 1 + (rng.next() - 0.5) * 0.2; // ±10% variance on rentals
    const stats: UnitStats = clampStats({
      damage: STARTER_DAMAGE * qualityMultiplier * variance(),
      hp: STARTER_HP * qualityMultiplier * variance(),
      attackRateMs: STARTER_ATTACK_RATE_MS / qualityMultiplier * variance(),
    });
    results.push({
      unit: {
        id: generateUnitId(),
        name: "",
        stats,
        mutations: [],
        parentIds: [],
      },
      isRental: true,
    });
  }

  return results;
}
