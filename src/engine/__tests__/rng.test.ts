import { describe, it, expect } from "vitest";
import { createRNG } from "../rng";

describe("rng", () => {
  it("produces deterministic output for the same seed", () => {
    const a = createRNG(42);
    const b = createRNG(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("returns values in [0, 1)", () => {
    const rng = createRNG(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt returns integers within range", () => {
    const rng = createRNG(99);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("state() returns a number that changes after draws", () => {
    const rng = createRNG(10);
    const s1 = rng.state();
    rng.next();
    const s2 = rng.state();
    expect(s1).not.toBe(s2);
  });
});
