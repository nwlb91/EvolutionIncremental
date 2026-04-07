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

/** Does the child beat either parent on at least one stat? */
function hasAnyStatImprovement(child: UnitStats, a: UnitStats, b: UnitStats): boolean {
  const stats: (keyof UnitStats)[] = ["damage", "hp", "attackRateMs"];
  return stats.some((s) => {
    const bestParent = statIsBetter(s, a[s], b[s]) ? a[s] : b[s];
    return statIsBetter(s, child[s], bestParent);
  });
}

/** Does the child have any mutation that neither parent has? */
function hasNewMutation(child: Unit, parentA: Unit, parentB: Unit): boolean {
  const parentMutIds = new Set([
    ...parentA.mutations.map((m) => m.id),
    ...parentB.mutations.map((m) => m.id),
  ]);
  return child.mutations.some((m) => !parentMutIds.has(m.id));
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
  excludeUnitIds: Set<string>;
  onBreedingUnitsChange: (ids: Set<string>) => void;
}

export function BreedingPanel({ roster, rentals, breeding, dispatch, rng, excludeUnitIds, onBreedingUnitsChange }: Props) {
  const [parentA, setParentA] = useState<string>("");
  const [parentB, setParentB] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [autoBreed, setAutoBreed] = useState(false);
  const [keyStat, setKeyStat] = useState<KeyStat>("none");
  const [autoDismiss, setAutoDismiss] = useState(false);
  const [keepIfStatImproved, setKeepIfStatImproved] = useState(true);
  const [keepIfNewMutation, setKeepIfNewMutation] = useState(true);
  const [lastChildInfo, setLastChildInfo] = useState<string | null>(null);

  const pendingAutoStart = useRef(false);

  // All available units (owned + rentals), excluding busy units
  const allUnits: Unit[] = [
    ...Object.values(roster),
    ...Object.values(rentals).map((r) => r.unit),
  ].filter((u) => !excludeUnitIds.has(u.id));

  const findUnit = useCallback(
    (id: string): Unit | undefined => roster[id] ?? rentals[id]?.unit,
    [roster, rentals],
  );

  // Report breeding unit IDs to parent
  useEffect(() => {
    if (breeding) {
      onBreedingUnitsChange(new Set([breeding.parentA, breeding.parentB]));
    } else {
      onBreedingUnitsChange(new Set());
    }
  }, [breeding, onBreedingUnitsChange]);

  // Auto-start breeding when idle + auto-breed is on + both parents selected
  useEffect(() => {
    if (!autoBreed || breeding || pendingAutoStart.current) return;
    if (!parentA || !parentB || parentA === parentB) return;
    if (!findUnit(parentA) || !findUnit(parentB)) return;

    pendingAutoStart.current = true;
    const t = setTimeout(() => {
      pendingAutoStart.current = false;
      const op = startBreeding(parentA, parentB, Date.now());
      dispatch({ type: "START_BREEDING", op });
    }, 100);
    return () => { clearTimeout(t); pendingAutoStart.current = false; };
  }, [autoBreed, breeding, parentA, parentB, findUnit, dispatch]);

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

          // --- Auto-replace logic (key stat) ---
          if (autoBreed && keyStat !== "none") {
            const stat = keyStat;
            const childVal = child.stats[stat];
            const aVal = a.stats[stat];
            const bVal = b.stats[stat];

            const aIsWorse = statIsBetter(stat, bVal, aVal);
            const worseParent = aIsWorse ? a : b;
            const worseVal = aIsWorse ? aVal : bVal;

            if (statIsBetter(stat, childVal, worseVal)) {
              dispatch({ type: "REMOVE_UNIT", unitId: worseParent.id });
              if (aIsWorse) {
                setParentA(child.id);
              } else {
                setParentB(child.id);
              }
              setLastChildInfo(
                `Replaced ${worseParent.name || worseParent.id.slice(0, 12)} ` +
                `(${statLabel(stat)}: ${worseVal} → ${childVal})`,
              );
              return;
            }
          }

          // --- Auto-dismiss logic ---
          if (autoBreed && autoDismiss) {
            // Check exceptions before dismissing
            const shouldKeep =
              (keepIfStatImproved && hasAnyStatImprovement(child.stats, a.stats, b.stats)) ||
              (keepIfNewMutation && hasNewMutation(child, a, b));

            if (!shouldKeep) {
              dispatch({ type: "REMOVE_UNIT", unitId: child.id });
              setLastChildInfo(
                `Auto-dismissed offspring (DMG:${child.stats.damage} HP:${child.stats.hp} Rate:${child.stats.attackRateMs})`,
              );
              return;
            } else {
              const reasons: string[] = [];
              if (keepIfStatImproved && hasAnyStatImprovement(child.stats, a.stats, b.stats)) {
                reasons.push("stat improvement");
              }
              if (keepIfNewMutation && hasNewMutation(child, a, b)) {
                reasons.push("new mutation");
              }
              setLastChildInfo(
                `Kept offspring — ${reasons.join(", ")} (DMG:${child.stats.damage} HP:${child.stats.hp} Rate:${child.stats.attackRateMs})`,
              );
              return;
            }
          }

          setLastChildInfo(null);
        } else {
          dispatch({ type: "CANCEL_BREEDING" });
          setLastChildInfo(null);
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [breeding, findUnit, rng, dispatch, autoBreed, keyStat, autoDismiss, keepIfStatImproved, keepIfNewMutation]);

  const handleStart = () => {
    if (!parentA || !parentB || parentA === parentB) return;
    const op = startBreeding(parentA, parentB, Date.now());
    dispatch({ type: "START_BREEDING", op });
  };

  const parentAUnit = findUnit(parentA);
  const parentBUnit = findUnit(parentB);

  const parentABusy = !!parentA && excludeUnitIds.has(parentA);
  const parentBBusy = !!parentB && excludeUnitIds.has(parentB);
  const canStart = !!parentA && !!parentB && parentA !== parentB && !parentABusy && !parentBBusy;

  return (
    <div>
      <h2>Breeding</h2>

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
          {parentABusy && <span style={{ color: "#fa0", fontSize: 11, marginLeft: 4 }}>(in battle)</span>}
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
          {parentBBusy && <span style={{ color: "#fa0", fontSize: 11, marginLeft: 4 }}>(in battle)</span>}
        </label>
      </div>

      {parentAUnit && parentBUnit && (
        <div style={{ fontSize: 11, color: "#888", marginBottom: 8, lineHeight: 1.6 }}>
          A: DMG {parentAUnit.stats.damage} | HP {parentAUnit.stats.hp} | Rate {parentAUnit.stats.attackRateMs}
          <br />
          B: DMG {parentBUnit.stats.damage} | HP {parentBUnit.stats.hp} | Rate {parentBUnit.stats.attackRateMs}
        </div>
      )}

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

      {!breeding && (
        <button
          onClick={handleStart}
          disabled={!canStart}
          style={{ marginBottom: 8 }}
        >
          Start Breeding (30s)
        </button>
      )}

      <div style={{ marginTop: 8, padding: 8, background: "#1a1a2e", borderRadius: 6, border: "1px solid #333" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoBreed}
            onChange={(e) => setAutoBreed(e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>Auto-breed when ready</span>
        </label>

        {autoBreed && (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
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

            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoDismiss}
                onChange={(e) => setAutoDismiss(e.target.checked)}
              />
              <span style={{ fontSize: 12 }}>Auto-dismiss inferior offspring</span>
            </label>

            {autoDismiss && (
              <div style={{ marginLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={keepIfStatImproved}
                    onChange={(e) => setKeepIfStatImproved(e.target.checked)}
                  />
                  <span style={{ fontSize: 11, color: "#aaa" }}>Keep if any stat exceeds both parents</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={keepIfNewMutation}
                    onChange={(e) => setKeepIfNewMutation(e.target.checked)}
                  />
                  <span style={{ fontSize: 11, color: "#aaa" }}>Keep if offspring has a new mutation</span>
                </label>
              </div>
            )}
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
