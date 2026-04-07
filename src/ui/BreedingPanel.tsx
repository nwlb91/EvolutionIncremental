import { useState, useEffect } from "react";
import type { Unit } from "../engine/units";
import type { Rental } from "../engine/rentals";
import type { BreedingOperation } from "../engine/breeding";
import { startBreeding, isBreedingComplete, resolveBreeding } from "../engine/breeding";
import type { GameAction } from "../engine/state";
import type { RNG } from "../engine/rng";

interface Props {
  roster: Record<string, Unit>;
  rentals: Record<string, Rental>;
  breeding: BreedingOperation | null;
  dispatch: (a: GameAction) => void;
  rng: RNG;
}

export function BreedingPanel({ roster, rentals, breeding, dispatch, rng }: Props) {
  const [parentA, setParentA] = useState<string>("");
  const [parentB, setParentB] = useState<string>("");
  const [progress, setProgress] = useState(0);

  // All available units (owned + rentals)
  const allUnits: Unit[] = [
    ...Object.values(roster),
    ...Object.values(rentals).map((r) => r.unit),
  ];

  // Progress ticker
  useEffect(() => {
    if (!breeding) {
      setProgress(0);
      return;
    }
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = now - breeding.startedAt;
      const pct = Math.min(100, (elapsed / breeding.durationMs) * 100);
      setProgress(pct);

      if (isBreedingComplete(breeding, now)) {
        clearInterval(id);
        // Find parent units
        const a = roster[breeding.parentA] ?? rentals[breeding.parentA]?.unit;
        const b = roster[breeding.parentB] ?? rentals[breeding.parentB]?.unit;
        if (a && b) {
          const result = resolveBreeding(a, b, rng);
          dispatch({ type: "COMPLETE_BREEDING", child: result.child });
          dispatch({ type: "UPDATE_RNG_STATE", state: rng.state() });
        } else {
          dispatch({ type: "CANCEL_BREEDING" });
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [breeding, roster, rentals, rng, dispatch]);

  const handleStart = () => {
    if (!parentA || !parentB || parentA === parentB) return;
    const op = startBreeding(parentA, parentB, Date.now());
    dispatch({ type: "START_BREEDING", op });
  };

  return (
    <div>
      <h2>Breeding</h2>
      {breeding ? (
        <div>
          <p>Breeding in progress...</p>
          <div style={{ background: "#333", height: 20, width: "100%", borderRadius: 4 }}>
            <div
              style={{
                background: "#0a0",
                height: "100%",
                width: `${progress}%`,
                borderRadius: 4,
                transition: "width 0.2s",
              }}
            />
          </div>
          <p>{Math.round(progress)}%</p>
        </div>
      ) : (
        <div>
          <label>
            Parent A:{" "}
            <select value={parentA} onChange={(e) => setParentA(e.target.value)}>
              <option value="">-- select --</option>
              {allUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.id.slice(0, 16)} (DMG:{u.stats.damage} HP:{u.stats.hp})
                </option>
              ))}
            </select>
          </label>
          <br />
          <label>
            Parent B:{" "}
            <select value={parentB} onChange={(e) => setParentB(e.target.value)}>
              <option value="">-- select --</option>
              {allUnits
                .filter((u) => u.id !== parentA)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.id.slice(0, 16)} (DMG:{u.stats.damage} HP:{u.stats.hp})
                  </option>
                ))}
            </select>
          </label>
          <br />
          <button onClick={handleStart} disabled={!parentA || !parentB || parentA === parentB}>
            Start Breeding (30s)
          </button>
        </div>
      )}
    </div>
  );
}
