import { describe, it, expect } from "vitest";
import { breedStats, startBreeding, isBreedingComplete, resolveBreeding } from "../breeding";
import { createUnit } from "../units";
import { createRNG } from "../rng";
import { BREEDING_DURATION_MS } from "../balance";

describe("breeding", () => {
  const parentA = createUnit("a", { damage: 20, hp: 200, attackRateMs: 1000 });
  const parentB = createUnit("b", { damage: 10, hp: 100, attackRateMs: 500 });

  it("breedStats returns stats within expected range", () => {
    const rng = createRNG(42);
    const stats = breedStats(parentA.stats, parentB.stats, rng);
    // Each stat should be close to one parent's value (±5%)
    expect(stats.damage).toBeGreaterThanOrEqual(1);
    expect(stats.hp).toBeGreaterThanOrEqual(1);
    expect(stats.attackRateMs).toBeGreaterThanOrEqual(1);
  });

  it("startBreeding creates an operation with correct duration", () => {
    const op = startBreeding("a", "b", 1000);
    expect(op.parentA).toBe("a");
    expect(op.parentB).toBe("b");
    expect(op.durationMs).toBe(BREEDING_DURATION_MS);
  });

  it("isBreedingComplete respects duration", () => {
    const op = startBreeding("a", "b", 1000);
    expect(isBreedingComplete(op, 1000)).toBe(false);
    expect(isBreedingComplete(op, 1000 + BREEDING_DURATION_MS - 1)).toBe(false);
    expect(isBreedingComplete(op, 1000 + BREEDING_DURATION_MS)).toBe(true);
  });

  it("resolveBreeding returns a child with both parent IDs", () => {
    const rng = createRNG(7);
    const result = resolveBreeding(parentA, parentB, rng);
    expect(result.child.parentIds).toEqual(["a", "b"]);
    expect(result.child.id).toMatch(/^unit_/);
  });
});
