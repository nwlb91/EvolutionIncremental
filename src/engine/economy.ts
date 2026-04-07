import type { EnemyDefinition } from "./enemies";
import {
  ENEMY_BASE_REWARD,
  ENEMY_REWARD_SCALING,
} from "./balance";

/** How much money the player earns for defeating an enemy. */
export function battleReward(enemy: EnemyDefinition): number {
  return ENEMY_BASE_REWARD + enemy.tier * ENEMY_REWARD_SCALING;
}
