import { describe, it, expect } from "vitest";
import { resolveBattle } from "../combat";
import type { Combatant } from "../combat";

describe("combat", () => {
  it("stronger unit wins", () => {
    const strong: Combatant = { id: "s", stats: { damage: 50, hp: 200, attackRateMs: 500 } };
    const weak: Combatant = { id: "w", stats: { damage: 5, hp: 50, attackRateMs: 1000 } };
    const result = resolveBattle(strong, weak);
    expect(result.outcome).toBe("left_wins");
    expect(result.winnerIndex).toBe(0);
    expect(result.ticks).toBeGreaterThan(0);
    expect(result.log.length).toBe(result.ticks);
  });

  it("produces a tick log with HP snapshots", () => {
    const a: Combatant = { id: "a", stats: { damage: 10, hp: 100, attackRateMs: 500 } };
    const b: Combatant = { id: "b", stats: { damage: 10, hp: 100, attackRateMs: 500 } };
    const result = resolveBattle(a, b);
    expect(result.log.length).toBeGreaterThan(0);
    const lastTick = result.log[result.log.length - 1];
    // At least one combatant should be at 0 HP
    const minHp = Math.min(lastTick.combatants[0].hp, lastTick.combatants[1].hp);
    expect(minHp).toBe(0);
  });

  it("identical units produce a deterministic result", () => {
    const unit: Combatant = { id: "x", stats: { damage: 10, hp: 100, attackRateMs: 1000 } };
    const r1 = resolveBattle(unit, { ...unit, id: "y" });
    const r2 = resolveBattle(unit, { ...unit, id: "y" });
    expect(r1.outcome).toBe(r2.outcome);
    expect(r1.ticks).toBe(r2.ticks);
  });
});
