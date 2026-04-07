import type { UnitStats } from "./units";
import { COMBAT_TICK_MS, COMBAT_MAX_TICKS } from "./balance";

// ── Types ──

/** Snapshot of one combatant at a given tick. */
export interface CombatantState {
  id: string;
  hp: number;
  maxHp: number;
  timerMs: number; // ms remaining until next attack
}

/** A single tick event in the battle log. */
export interface CombatTick {
  tick: number;
  attackerId: string | null; // null = no attack this tick
  damage: number;
  combatants: [CombatantState, CombatantState];
}

export type CombatOutcome = "left_wins" | "right_wins" | "draw";

export interface BattleResult {
  outcome: CombatOutcome;
  ticks: number;
  log: CombatTick[];
  /** Which combatant index won (0 = left, 1 = right, null = draw). */
  winnerIndex: 0 | 1 | null;
}

/** Input to the combat resolver — intentionally decoupled from Unit so we
 *  can later pass squads or modified stat blocks without changing the combat API. */
export interface Combatant {
  id: string;
  stats: UnitStats;
}

// ── Resolver ──

/**
 * Run a full battle between two combatants and return the result + tick log.
 * Pure function — no side effects, fully deterministic given identical inputs.
 */
export function resolveBattle(left: Combatant, right: Combatant): BattleResult {
  const state: [CombatantState, CombatantState] = [
    { id: left.id, hp: left.stats.hp, maxHp: left.stats.hp, timerMs: left.stats.attackRateMs },
    { id: right.id, hp: right.stats.hp, maxHp: right.stats.hp, timerMs: right.stats.attackRateMs },
  ];

  const stats = [left.stats, right.stats];
  const log: CombatTick[] = [];

  for (let tick = 0; tick < COMBAT_MAX_TICKS; tick++) {
    let attackerId: string | null = null;
    let damageDealt = 0;

    for (let i = 0; i < 2; i++) {
      state[i].timerMs -= COMBAT_TICK_MS;
      if (state[i].timerMs <= 0 && state[0].hp > 0 && state[1].hp > 0) {
        const target = 1 - i;
        const dmg = stats[i].damage;
        state[target].hp = Math.max(0, state[target].hp - dmg);
        state[i].timerMs += stats[i].attackRateMs;
        attackerId = state[i].id;
        damageDealt = dmg;
      }
    }

    log.push({
      tick,
      attackerId,
      damage: damageDealt,
      combatants: [{ ...state[0] }, { ...state[1] }],
    });

    if (state[0].hp <= 0 || state[1].hp <= 0) {
      const winnerIndex: 0 | 1 | null =
        state[0].hp > 0 ? 0 : state[1].hp > 0 ? 1 : null;
      return {
        outcome:
          winnerIndex === 0 ? "left_wins" : winnerIndex === 1 ? "right_wins" : "draw",
        ticks: tick + 1,
        log,
        winnerIndex,
      };
    }
  }

  // Exceeded max ticks — whoever has more HP% wins, else draw
  const pctLeft = state[0].hp / state[0].maxHp;
  const pctRight = state[1].hp / state[1].maxHp;
  const winnerIndex: 0 | 1 | null =
    pctLeft > pctRight ? 0 : pctRight > pctLeft ? 1 : null;
  return {
    outcome:
      winnerIndex === 0 ? "left_wins" : winnerIndex === 1 ? "right_wins" : "draw",
    ticks: COMBAT_MAX_TICKS,
    log,
    winnerIndex,
  };
}
