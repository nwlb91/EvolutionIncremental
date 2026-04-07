import type { EnemyDefinition } from "./enemies";
import {
  ENEMY_BASE_REWARD,
  ENEMY_REWARD_SCALING,
  RENTAL_SEARCH_BASE_COST,
  RENTAL_BATTLE_FLAT_FEE,
  RENTAL_BATTLE_WINNINGS_CUT,
} from "./balance";

/** How much money the player earns for defeating an enemy. */
export function battleReward(enemy: EnemyDefinition): number {
  return ENEMY_BASE_REWARD + enemy.tier * ENEMY_REWARD_SCALING;
}

/** Cost to initiate a rental search. Budget is what the player spends on quality. */
export function rentalSearchCost(budget: number): number {
  return RENTAL_SEARCH_BASE_COST + budget;
}

/** Flat fee charged each time a rental unit is sent into battle. */
export function rentalBattleFee(): number {
  return RENTAL_BATTLE_FLAT_FEE;
}

/** Percentage of winnings taken as cut when a rental wins a battle. */
export function rentalWinningsCut(grossWinnings: number): number {
  return Math.floor(grossWinnings * RENTAL_BATTLE_WINNINGS_CUT);
}

/** Net winnings after rental fees for a victorious rental. */
export function netRentalWinnings(grossWinnings: number): number {
  return grossWinnings - rentalBattleFee() - rentalWinningsCut(grossWinnings);
}
