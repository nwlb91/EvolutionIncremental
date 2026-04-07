import { describe, it, expect } from "vitest";
import { battleReward, rentalSearchCost, rentalBattleFee, netRentalWinnings } from "../economy";
import { ENEMY_LADDER } from "../enemies";

describe("economy", () => {
  it("battleReward scales with enemy tier", () => {
    const r0 = battleReward(ENEMY_LADDER[0]);
    const r9 = battleReward(ENEMY_LADDER[9]);
    expect(r9).toBeGreaterThan(r0);
    expect(r0).toBeGreaterThan(0);
  });

  it("rentalSearchCost includes base + budget", () => {
    expect(rentalSearchCost(0)).toBeGreaterThan(0);
    expect(rentalSearchCost(50)).toBeGreaterThan(rentalSearchCost(0));
  });

  it("netRentalWinnings is less than gross", () => {
    const gross = 100;
    const net = netRentalWinnings(gross);
    expect(net).toBeLessThan(gross);
    expect(net).toBeGreaterThan(0);
  });

  it("rentalBattleFee returns a positive number", () => {
    expect(rentalBattleFee()).toBeGreaterThan(0);
  });
});
