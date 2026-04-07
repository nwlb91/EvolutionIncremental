import type { Combatant } from "./combat";
import {
  ENEMY_COUNT,
  ENEMY_BASE_DAMAGE,
  ENEMY_DAMAGE_SCALING,
  ENEMY_BASE_HP,
  ENEMY_HP_SCALING,
  ENEMY_BASE_ATTACK_RATE_MS,
  ENEMY_ATTACK_RATE_DECAY,
} from "./balance";

export interface EnemyDefinition {
  id: string;
  name: string;
  tier: number; // 0-indexed ladder position
  stats: {
    damage: number;
    hp: number;
    attackRateMs: number;
  };
}

function buildEnemy(tier: number): EnemyDefinition {
  return {
    id: `enemy_${tier}`,
    name: `Beast Tier ${tier + 1}`,
    tier,
    stats: {
      damage: ENEMY_BASE_DAMAGE + tier * ENEMY_DAMAGE_SCALING,
      hp: ENEMY_BASE_HP + tier * ENEMY_HP_SCALING,
      attackRateMs: Math.max(200, ENEMY_BASE_ATTACK_RATE_MS - tier * ENEMY_ATTACK_RATE_DECAY),
    },
  };
}

/** The full enemy ladder, generated once from balance constants. */
export const ENEMY_LADDER: EnemyDefinition[] = Array.from(
  { length: ENEMY_COUNT },
  (_, i) => buildEnemy(i),
);

/** Convert an enemy definition to a Combatant for the combat resolver. */
export function enemyToCombatant(enemy: EnemyDefinition): Combatant {
  return { id: enemy.id, stats: enemy.stats, mutations: [] };
}
