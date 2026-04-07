import { describe, it, expect } from "vitest";
import { gameReducer, createInitialState } from "../state";
import { createUnit } from "../units";

describe("state", () => {
  const initial = createInitialState(42);

  it("ADD_UNIT adds a unit to the roster", () => {
    const unit = createUnit("u1", { damage: 10, hp: 100, attackRateMs: 1000 });
    const next = gameReducer(initial, { type: "ADD_UNIT", unit });
    expect(next.roster["u1"]).toBe(unit);
  });

  it("SPEND_MONEY / ADD_MONEY adjusts balance", () => {
    let s = gameReducer(initial, { type: "ADD_MONEY", amount: 100 });
    expect(s.money).toBe(100);
    s = gameReducer(s, { type: "SPEND_MONEY", amount: 40 });
    expect(s.money).toBe(60);
  });

  it("REMOVE_UNIT removes a unit", () => {
    const unit = createUnit("u1", { damage: 10, hp: 100, attackRateMs: 1000 });
    let s = gameReducer(initial, { type: "ADD_UNIT", unit });
    s = gameReducer(s, { type: "REMOVE_UNIT", unitId: "u1" });
    expect(s.roster["u1"]).toBeUndefined();
  });

  it("LOAD_STATE replaces the entire state", () => {
    const other = { ...initial, money: 999 };
    const s = gameReducer(initial, { type: "LOAD_STATE", state: other });
    expect(s.money).toBe(999);
  });
});
