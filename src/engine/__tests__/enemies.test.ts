import { describe, it, expect } from "vitest";
import { ENEMY_LADDER, enemyToCombatant } from "../enemies";
import { ENEMY_COUNT } from "../balance";

describe("enemies", () => {
  it("generates the correct number of enemies", () => {
    expect(ENEMY_LADDER.length).toBe(ENEMY_COUNT);
  });

  it("enemies scale in difficulty", () => {
    for (let i = 1; i < ENEMY_LADDER.length; i++) {
      expect(ENEMY_LADDER[i].stats.damage).toBeGreaterThan(ENEMY_LADDER[i - 1].stats.damage);
      expect(ENEMY_LADDER[i].stats.hp).toBeGreaterThan(ENEMY_LADDER[i - 1].stats.hp);
      expect(ENEMY_LADDER[i].stats.attackRateMs).toBeLessThanOrEqual(ENEMY_LADDER[i - 1].stats.attackRateMs);
    }
  });

  it("enemyToCombatant converts correctly", () => {
    const enemy = ENEMY_LADDER[0];
    const combatant = enemyToCombatant(enemy);
    expect(combatant.id).toBe(enemy.id);
    expect(combatant.stats).toBe(enemy.stats);
  });
});
