import { useState, useEffect, useRef, useCallback } from "react";
import type { Unit, UnitStats } from "../engine/units";
import type { Rental } from "../engine/rentals";
import type { BreedingOperation } from "../engine/breeding";
import { startBreeding, isBreedingComplete, resolveBreeding } from "../engine/breeding";
import type { GameAction } from "../engine/state";
import type { RNG } from "../engine/rng";

type KeyStat = keyof UnitStats | "none";

/** For damage & hp, higher is better. For attackRateMs, lower is better. */
function statIsBetter(stat: keyof UnitStats, a: number, b: number): boolean {
  if (stat === "attackRateMs") return a < b;
  return a > b;
}

function statLabel(stat: KeyStat): string {
  switch (stat) {
    case "damage": return "DMG";
    case "hp": return "HP";
    case "attackRateMs": return "Rate (lower=faster)";
    default: return "";
  }
}

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
  const [autoBread, setAutoBreed] = useState(false);
  const [keyStat, setKeyStat] = useState<KeyStat>("none");
  const [lastChildInfo, setLastChildInfo] = useState<string | null>(null);

  // Use a ref to track pending auto-start so we don't double-fire
  const pendingAutoStart = useRef(false);

  // All available units (owned + rentals)
  const allUnits: Unit[] = [
    ...Object.values(roster),
    ...Object.values(rentals).map((r) => r.unit),
  ];

  const findUnit = useCallback(
    (id: string): Unit | undefined => roster[id] ?? rentals[id]?.unit,
    [roster, rentals],
  );

  // Auto-start breeding when idle + auto-breed is on + both parents selected
  useEffect(() => {
    if (!autoBread || breeding || pendingAutoStart.current) return;
    if (!parentA || !parentB || parentA === parentB) return;
    // Verify both parents still exist
    if (!findUnit(parentA) || !findUnit(parentB)) return;

    pendingAutoStart.current = true;
    // Small delay so state settles after a completed breed
    const t = setTimeout(() => {
      pendingAutoStart.current = false;
      const op = startBreeding(parentA, parentB, Date.now());
      dispatch({ type: "START_BREEDING", op });
    }, 100);
    return () => { clearTimeout(t); pendingAutoStart.current = false; };
  }, [autoBread, breeding, parentA, parentB, findUnit, dispatch]);

  // Progress ticker + completion handler
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
        const a = findUnit(breeding.parentA);
        const b = findUnit(breeding.parentB);
        if (a && b) {
          const result = resolveBreeding(a, b, rng);
          const child = result.child;
          dispatch({ type: "COMPLETE_BREEDING", child });
          dispatch({ type: "UPDATE_RNG_STATE", state: rng.state() });

          // Auto-replace logic
          if (autoBread && keyStat !== "none") {
            const stat = keyStat;
            const childVal = child.stats[stat];
            const aVal = a.stats[stat];
            const bVal = b.stats[stat];

            // Find the worse parent for this stat
            const aIsWorse = statIsBetter(stat, bVal, aVal);
            const worseParent = aIsWorse ? a : b;
            const worseVal = aIsWorse ? aVal : bVal;

            if (statIsBetter(stat, childVal, worseVal)) {
              // Child beats the worse parent — replace them
              dispatch({ type: "REMOVE_UNIT", unitId: worseParent.id });
              // Update the breeding slot to use the child instead
              if (aIsWorse) {
                setParentA(child.id);
              } else {
                setParentB(child.id);
              }
              setLastChildInfo(
                `Replaced ${worseParent.name || worseParent.id.slice(0, 12)} ` +
                `(${statLabel(stat)}: ${worseVal} → ${childVal})`,
              );
            } else {
              // Child didn't beat either parent — dismiss child
              dispatch({ type: "REMOVE_UNIT", unitId: child.id });
              setLastChildInfo(
                `Dismissed offspring (${statLabel(stat)}: ${childVal}, ` +
                `needed > ${worseVal})`,
              );
            }
          } else {
            setLastChildInfo(null);
          }
        } else {
          dispatch({ type: "CANCEL_BREEDING" });
          setLastChildInfo(null);
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [breeding, findUnit, rng, dispatch, autoBread, keyStat]);

  const handleStart = () => {
    if (!parentA || !parentB || parentA === parentB) return;
    const op = startBreeding(parentA, parentB, Date.now());
    dispatch({ type: "START_BREEDING", op });
  };

  const parentAUnit = findUnit(parentA);
  const parentBUnit = findUnit(parentB);

  return (
    <div>
      <h2>Breeding</h2>

      {/* Parent selectors (always visible) */}
      <div style={{ marginBottom: 8 }}>
        <label>
          Parent A:{" "}
          <select value={parentA} onChange={(e) => setParentA(e.target.value)}>
            <option value="">-- select --</option>
            {allUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.id.slice(0, 16)} (DMG:{u.stats.damage} HP:{u.stats.hp} Rate:{u.stats.attackRateMs})
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
                  {u.name || u.id.slice(0, 16)} (DMG:{u.stats.damage} HP:{u.stats.hp} Rate:{u.stats.attackRateMs})
                </option>
              ))}
          </select>
        </label>
      </div>

      {/* Stat preview for selected parents */}
      {parentAUnit && parentBUnit && (
        <div style={{ fontSize: 11, color: "#888", marginBottom: 8, lineHeight: 1.6 }}>
          A: DMG {parentAUnit.stats.damage} | HP {parentAUnit.stats.hp} | Rate {parentAUnit.stats.attackRateMs}
          <br />
          B: DMG {parentBUnit.stats.damage} | HP {parentBUnit.stats.hp} | Rate {parentBUnit.stats.attackRateMs}
        </div>
      )}

      {/* Progress bar */}
      {breeding && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 13 }}>Breeding in progress...</p>
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
          <p style={{ fontSize: 12, color: "#888" }}>{Math.round(progress)}%</p>
        </div>
      )}

      {/* Manual start button */}
      {!breeding && (
        <button
          onClick={handleStart}
          disabled={!parentA || !parentB || parentA === parentB}
          style={{ marginBottom: 8 }}
        >
          Start Breeding (30s)
        </button>
      )}

      {/* Auto-breed controls */}
      <div style={{ marginTop: 8, padding: 8, background: "#1a1a2e", borderRadius: 6, border: "1px solid #333" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoBread}
            onChange={(e) => setAutoBreed(e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>Auto-breed when ready</span>
        </label>

        {autoBread && (
          <div style={{ marginTop: 6 }}>
            <label style={{ fontSize: 12 }}>
              Key stat (auto-replace worse parent):{" "}
              <select
                value={keyStat}
                onChange={(e) => { setKeyStat(e.target.value as KeyStat); setLastChildInfo(null); }}
                style={{ fontSize: 12 }}
              >
                <option value="none">None (keep all offspring)</option>
                <option value="damage">Damage (higher = better)</option>
                <option value="hp">HP (higher = better)</option>
                <option value="attackRateMs">Attack Rate (lower = better)</option>
              </select>
            </label>
          </div>
        )}

        {lastChildInfo && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#aaf", fontStyle: "italic" }}>
            {lastChildInfo}
          </div>
        )}
      </div>
    </div>
  );
}
