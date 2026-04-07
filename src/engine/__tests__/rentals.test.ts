import { describe, it, expect } from "vitest";
import { generateRentals } from "../rentals";
import { createRNG } from "../rng";

describe("rentals", () => {
  it("generates the requested number of rentals", () => {
    const rng = createRNG(123);
    const rentals = generateRentals({ budget: 50, resultCount: 3 }, rng);
    expect(rentals.length).toBe(3);
    rentals.forEach((r) => {
      expect(r.isRental).toBe(true);
      expect(r.unit.stats.damage).toBeGreaterThan(0);
      expect(r.unit.stats.hp).toBeGreaterThan(0);
    });
  });

  it("higher budget produces better average stats", () => {
    const rngLow = createRNG(1);
    const rngHigh = createRNG(1);
    const low = generateRentals({ budget: 10, resultCount: 20 }, rngLow);
    const high = generateRentals({ budget: 200, resultCount: 20 }, rngHigh);
    const avgDmg = (list: typeof low) =>
      list.reduce((s, r) => s + r.unit.stats.damage, 0) / list.length;
    expect(avgDmg(high)).toBeGreaterThan(avgDmg(low));
  });
});
