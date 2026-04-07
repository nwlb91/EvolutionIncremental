import type { UnitStats, MutationInstance } from "./units";
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
  mutations: MutationInstance[];
}

// ── Mutation helpers ──

/** Sum mutation values for a specific mutation id across a combatant's mutations. */
function mutValue(mutations: MutationInstance[], id: string): number {
  let total = 0;
  for (const m of mutations) {
    if (m.mutationId === id) total += m.value;
  }
  return total;
}

/**
 * Apply pre-combat stat mutations and return effective stats.
 * - sharp_claws: +damage%
 * - iron_jaw: +HP%
 * - quick_twitch: -attackRate% (lower = faster)
 * - endurance: +damage% and +HP%
 * - apex_predator: +damage%, +HP%, -attackRate%
 */
export function applyStatMutations(base: UnitStats, mutations: MutationInstance[]): UnitStats {
  let damageMult = 1;
  let hpMult = 1;
  let rateMult = 1;

  damageMult += mutValue(mutations, "sharp_claws");
  hpMult     += mutValue(mutations, "iron_jaw");
  rateMult   -= mutValue(mutations, "quick_twitch");

  const endurance = mutValue(mutations, "endurance");
  damageMult += endurance;
  hpMult     += endurance;

  const apex = mutValue(mutations, "apex_predator");
  damageMult += apex;
  hpMult     += apex;
  rateMult   -= apex;

  // Rate multiplier can't go below 10% (safety floor)
  rateMult = Math.max(0.1, rateMult);

  return {
    damage: base.damage * damageMult,
    hp: base.hp * hpMult,
    attackRateMs: base.attackRateMs * rateMult,
  };
}

// ── Resolver ──

/**
 * Run a full battle between two combatants and return the result + tick log.
 * Pure function — no side effects, fully deterministic given identical inputs.
 */
export function resolveBattle(left: Combatant, right: Combatant): BattleResult {
  // Apply pre-combat stat mutations
  const effLeft = applyStatMutations(left.stats, left.mutations);
  const effRight = applyStatMutations(right.stats, right.mutations);

  const state: [CombatantState, CombatantState] = [
    { id: left.id, hp: effLeft.hp, maxHp: effLeft.hp, timerMs: effLeft.attackRateMs },
    { id: right.id, hp: effRight.hp, maxHp: effRight.hp, timerMs: effRight.attackRateMs },
  ];

  const effStats = [effLeft, effRight];
  const muts = [left.mutations, right.mutations];

  // Fortify: track stacking damage reduction per combatant
  const fortifyStacks = [0, 0];

  const log: CombatTick[] = [];

  for (let tick = 0; tick < COMBAT_MAX_TICKS; tick++) {
    let attackerId: string | null = null;
    let damageDealt = 0;

    // Regeneration: heal each combatant each tick
    for (let i = 0; i < 2; i++) {
      const regenPct = mutValue(muts[i], "regeneration");
      if (regenPct > 0 && state[i].hp > 0) {
        state[i].hp = Math.min(state[i].maxHp, state[i].hp + state[i].maxHp * regenPct);
      }
    }

    for (let i = 0; i < 2; i++) {
      state[i].timerMs -= COMBAT_TICK_MS;
      if (state[i].timerMs <= 0 && state[0].hp > 0 && state[1].hp > 0) {
        const target = 1 - i;

        // Base damage
        let dmg = effStats[i].damage;

        // Berserk: bonus damage when attacker is below 50% HP
        const berserkPct = mutValue(muts[i], "berserk");
        if (berserkPct > 0 && state[i].hp < state[i].maxHp * 0.5) {
          dmg *= 1 + berserkPct;
        }

        // Thick Hide: target reduces incoming damage
        const thickHidePct = mutValue(muts[target], "thick_hide");
        if (thickHidePct > 0) {
          dmg *= 1 - thickHidePct;
        }

        // Fortify: target reduces incoming damage by stacking amount
        const fortifyPct = mutValue(muts[target], "fortify");
        if (fortifyPct > 0) {
          dmg *= 1 - fortifyStacks[target] * fortifyPct;
          fortifyStacks[target]++;
        }

        dmg = Math.max(0, dmg);
        state[target].hp = Math.max(0, state[target].hp - dmg);
        state[i].timerMs += effStats[i].attackRateMs;
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
