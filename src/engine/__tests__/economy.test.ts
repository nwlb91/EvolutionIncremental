import { describe, it, expect } from "vitest";
import { battleReward } from "../economy";
import { ENEMY_LADDER } from "../enemies";

describe("economy", () => {
  it("battleReward scales with enemy tier", () => {
    const r0 = battleReward(ENEMY_LADDER[0]);
    const r9 = battleReward(ENEMY_LADDER[9]);
    expect(r9).toBeGreaterThan(r0);
    expect(r0).toBeGreaterThan(0);
  });
});
