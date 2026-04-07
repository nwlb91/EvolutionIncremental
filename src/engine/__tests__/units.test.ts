import { describe, it, expect, beforeEach } from "vitest";
import { createStarterUnit, createUnit, resetIdCounter } from "../units";
import { createRNG } from "../rng";

describe("units", () => {
  beforeEach(() => resetIdCounter());

  it("createStarterUnit returns a unit with reasonable stats", () => {
    const rng = createRNG(1);
    const unit = createStarterUnit(rng);
    expect(unit.id).toMatch(/^unit_/);
    expect(unit.stats.damage).toBeGreaterThan(0);
    expect(unit.stats.hp).toBeGreaterThan(0);
    expect(unit.stats.attackRateMs).toBeGreaterThan(0);
    expect(unit.mutations).toEqual([]);
    expect(unit.parentIds).toEqual([]);
  });

  it("createUnit builds a unit with specified values", () => {
    const unit = createUnit("u1", { damage: 5, hp: 50, attackRateMs: 800 }, ["p1", "p2"], "Bob");
    expect(unit.id).toBe("u1");
    expect(unit.name).toBe("Bob");
    expect(unit.parentIds).toEqual(["p1", "p2"]);
  });

  it("units are JSON-serializable", () => {
    const rng = createRNG(2);
    const unit = createStarterUnit(rng);
    const json = JSON.stringify(unit);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(unit.id);
    expect(parsed.stats).toEqual(unit.stats);
  });
});
