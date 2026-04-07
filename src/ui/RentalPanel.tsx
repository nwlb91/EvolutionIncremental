import { useState } from "react";
import { fmtDmg, fmtHp, fmtRate } from "../engine/units";
import type { Rental } from "../engine/rentals";
import { generateRentals } from "../engine/rentals";
import { rentalSearchCost } from "../engine/economy";
import { RENTAL_SEARCH_MIN_RESULTS, RENTAL_SEARCH_MAX_RESULTS } from "../engine/balance";
import type { GameAction } from "../engine/state";
import type { RNG } from "../engine/rng";

interface Props {
  rentals: Record<string, Rental>;
  money: number;
  dispatch: (a: GameAction) => void;
  rng: RNG;
}

export function RentalPanel({ rentals, money, dispatch, rng }: Props) {
  const [budget, setBudget] = useState(20);
  const [count, setCount] = useState(3);
  const [searchResults, setSearchResults] = useState<Rental[]>([]);

  const cost = rentalSearchCost(budget);

  const handleSearch = () => {
    if (money < cost) return;
    dispatch({ type: "SPEND_MONEY", amount: cost });
    const results = generateRentals(
      { budget, resultCount: Math.min(RENTAL_SEARCH_MAX_RESULTS, Math.max(RENTAL_SEARCH_MIN_RESULTS, count)) },
      rng,
    );
    dispatch({ type: "UPDATE_RNG_STATE", state: rng.state() });
    setSearchResults(results);
  };

  const handleHire = (rental: Rental) => {
    dispatch({ type: "ADD_RENTAL", rental });
    setSearchResults((prev) => prev.filter((r) => r.unit.id !== rental.unit.id));
  };

  const handleRelease = (unitId: string) => {
    dispatch({ type: "RELEASE_RENTAL", unitId });
  };

  const rentalList = Object.values(rentals);

  return (
    <div>
      <h2>Rental Market</h2>
      <div style={{ marginBottom: 8 }}>
        <label>
          Budget: $
          <input
            type="number"
            value={budget}
            min={0}
            onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
            style={{ width: 60 }}
          />
        </label>{" "}
        <label>
          Results:
          <input
            type="number"
            value={count}
            min={RENTAL_SEARCH_MIN_RESULTS}
            max={RENTAL_SEARCH_MAX_RESULTS}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{ width: 40 }}
          />
        </label>{" "}
        <button onClick={handleSearch} disabled={money < cost}>
          Search (${cost})
        </button>
      </div>

      {searchResults.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h3>Search Results</h3>
          {searchResults.map((r) => (
            <div key={r.unit.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span>
                DMG:{fmtDmg(r.unit.stats.damage)} HP:{fmtHp(r.unit.stats.hp)} Rate:{fmtRate(r.unit.stats.attackRateMs)}ms
              </span>
              <button onClick={() => handleHire(r)}>Hire</button>
            </div>
          ))}
        </div>
      )}

      <h3>Active Rentals ({rentalList.length})</h3>
      {rentalList.length === 0 && <p>No active rentals.</p>}
      {rentalList.map((r) => (
        <div key={r.unit.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
          <span>
            {r.unit.name || r.unit.id.slice(0, 12)} — DMG:{r.unit.stats.damage} HP:{r.unit.stats.hp} Rate:
            {r.unit.stats.attackRateMs}ms
          </span>
          <button onClick={() => handleRelease(r.unit.id)} style={{ color: "#f44" }}>
            Release
          </button>
        </div>
      ))}
    </div>
  );
}
