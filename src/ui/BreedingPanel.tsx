import { useState, useEffect, useRef, useCallback } from "react";
import { fmtDmg, fmtHp, fmtRate, fmtStat, type Unit, type UnitStats } from "../engine/units";
import type { BreedingOperation } from "../engine/breeding";
import { startBreeding, isBreedingComplete, resolveBreeding } from "../engine/breeding";
import { BREEDING_DURATION_MS } from "../engine/balance";
import type { GameAction } from "../engine/state";
import type { RNG } from "../engine/rng";

type KeyStat = keyof UnitStats | "none";

const ALL_STATS: (keyof UnitStats)[] = ["damage", "hp", "attackRateMs"];

/** For damage & hp, higher is better. For attackRateMs, lower is better. */
function statIsBetter(stat: keyof UnitStats, a: number, b: number): boolean {
  if (stat === "attackRateMs") return a < b;
  return a > b;
}

function statIsWorseOrEqual(stat: keyof UnitStats, a: number, b: number): boolean {
  return !statIsBetter(stat, a, b);
}

/** Does the child beat either parent on at least one stat? */
function hasAnyStatImprovement(child: UnitStats, a: UnitStats, b: UnitStats): boolean {
  return ALL_STATS.some((s) => {
    const bestParent = statIsBetter(s, a[s], b[s]) ? a[s] : b[s];
    return statIsBetter(s, child[s], bestParent);
  });
}

/** Does the child have any mutation that neither parent has? */
function hasNewMutation(child: Unit, parentA: Unit, parentB: Unit): boolean {
  const parentMutIds = new Set([
    ...parentA.mutations.map((m) => m.mutationId),
    ...parentB.mutations.map((m) => m.mutationId),
  ]);
  return child.mutations.some((m) => !parentMutIds.has(m.mutationId));
}

/** Is the child at least as good as both parents on every stat in the set? */
function isEquivalentOrBetter(child: UnitStats, a: UnitStats, b: UnitStats, stats: Set<keyof UnitStats>): boolean {
  for (const s of stats) {
    const bestParent = statIsBetter(s, a[s], b[s]) ? a[s] : b[s];
    if (statIsBetter(s, bestParent, child[s]) && child[s] !== bestParent) {
      return false; // child is strictly worse on this stat
    }
  }
  return true;
}

function statLabel(stat: keyof UnitStats | "none"): string {
  switch (stat) {
    case "damage": return "DMG";
    case "hp": return "HP";
    case "attackRateMs": return "Rate";
    default: return "";
  }
}

function fmtStatByKey(stat: keyof UnitStats, value: number): string {
  return fmtStat(value, stat);
}

interface Props {
  roster: Record<string, Unit>;
  breeding: BreedingOperation | null;
  dispatch: (a: GameAction) => void;
  rng: RNG;
  excludeUnitIds: Set<string>;
  onBreedingUnitsChange: (ids: Set<string>) => void;
}

export function BreedingPanel({ roster, breeding, dispatch, rng, excludeUnitIds, onBreedingUnitsChange }: Props) {
  const [parentA, setParentA] = useState<string>("");
  const [parentB, setParentB] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [autoBreed, setAutoBreed] = useState(false);
  const [keyStat, setKeyStat] = useState<KeyStat>("none");
  const [autoDismiss, setAutoDismiss] = useState(false);
  const [keepIfStatImproved, setKeepIfStatImproved] = useState(true);
  const [keepIfNewMutation, setKeepIfNewMutation] = useState(true);
  const [keepIfEquivalent, setKeepIfEquivalent] = useState(false);
  const [noRegressionGuard, setNoRegressionGuard] = useState(false);
  const [guardedStats, setGuardedStats] = useState<Set<keyof UnitStats>>(new Set());
  const [lastChildInfo, setLastChildInfo] = useState<string | null>(null);
  const [breedSpeed, setBreedSpeed] = useState(1);
  const [variationPct, setVariationPct] = useState(1);

  const pendingAutoStart = useRef(false);

  const allUnits: Unit[] = Object.values(roster).filter((u) => !excludeUnitIds.has(u.id));

  const findUnit = useCallback(
    (id: string): Unit | undefined => roster[id],
    [roster],
  );

  useEffect(() => {
    if (breeding) {
      onBreedingUnitsChange(new Set([breeding.parentA, breeding.parentB]));
    } else {
      onBreedingUnitsChange(new Set());
    }
  }, [breeding, onBreedingUnitsChange]);

  useEffect(() => {
    if (!autoBreed || breeding || pendingAutoStart.current) return;
    if (!parentA || !parentB || parentA === parentB) return;
    if (!findUnit(parentA) || !findUnit(parentB)) return;

    pendingAutoStart.current = true;
    const t = setTimeout(() => {
      pendingAutoStart.current = false;
      const op = startBreeding(parentA, parentB, Date.now());
      op.durationMs = Math.round(BREEDING_DURATION_MS / breedSpeed);
      dispatch({ type: "START_BREEDING", op });
    }, 100);
    return () => { clearTimeout(t); pendingAutoStart.current = false; };
  }, [autoBreed, breeding, parentA, parentB, findUnit, dispatch, breedSpeed]);

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
          const result = resolveBreeding(a, b, rng, variationPct / 100);
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
              // Check no-regression guard: child must not regress on guarded stats
              // compared to the parent it would replace
              if (noRegressionGuard && guardedStats.size > 0) {
                const regressions: string[] = [];
                for (const gs of guardedStats) {
                  if (statIsWorseOrEqual(gs, child.stats[gs], worseParent.stats[gs])
                      && child.stats[gs] !== worseParent.stats[gs]) {
                    regressions.push(
                      `${statLabel(gs)}: ${fmtStatByKey(gs, worseParent.stats[gs])} → ${fmtStatByKey(gs, child.stats[gs])}`,
                    );
                  }
                }
                if (regressions.length > 0) {
                  // Would regress — don't replace, dismiss child instead
                  dispatch({ type: "REMOVE_UNIT", unitId: child.id });
                  setLastChildInfo(
                    `Skipped replacement — regression: ${regressions.join(", ")}`,
                  );
                  return;
                }
              }

              dispatch({ type: "REMOVE_UNIT", unitId: worseParent.id });
              if (aIsWorse) {
                setParentA(child.id);
              } else {
                setParentB(child.id);
              }
              setLastChildInfo(
                `Replaced ${worseParent.name || worseParent.id.slice(0, 12)} ` +
                `(${statLabel(stat)}: ${fmtStatByKey(stat, worseVal)} → ${fmtStatByKey(stat, childVal)})`,
              );
              return;
            }
          }

          // --- Auto-dismiss logic ---
          if (autoBreed && autoDismiss) {
            const reasons: string[] = [];
            if (keepIfStatImproved && hasAnyStatImprovement(child.stats, a.stats, b.stats)) {
              reasons.push("stat improvement");
            }
            if (keepIfNewMutation && hasNewMutation(child, a, b)) {
              reasons.push("new mutation");
            }
            if (keepIfEquivalent && guardedStats.size > 0 &&
                isEquivalentOrBetter(child.stats, a.stats, b.stats, guardedStats)) {
              reasons.push("equivalent");
            }

            if (reasons.length === 0) {
              dispatch({ type: "REMOVE_UNIT", unitId: child.id });
              setLastChildInfo(
                `Auto-dismissed (DMG:${fmtDmg(child.stats.damage)} HP:${fmtHp(child.stats.hp)} Rate:${fmtRate(child.stats.attackRateMs)})`,
              );
              return;
            } else {
              setLastChildInfo(
                `Kept — ${reasons.join(", ")} (DMG:${fmtDmg(child.stats.damage)} HP:${fmtHp(child.stats.hp)} Rate:${fmtRate(child.stats.attackRateMs)})`,
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
  }, [breeding, findUnit, rng, dispatch, autoBreed, keyStat, autoDismiss, keepIfStatImproved, keepIfNewMutation, keepIfEquivalent, variationPct, noRegressionGuard, guardedStats]);

  const handleStart = () => {
    if (!parentA || !parentB || parentA === parentB) return;
    const op = startBreeding(parentA, parentB, Date.now());
    op.durationMs = Math.round(BREEDING_DURATION_MS / breedSpeed);
    dispatch({ type: "START_BREEDING", op });
  };

  const toggleGuardedStat = (stat: keyof UnitStats) => {
    setGuardedStats((prev) => {
      const next = new Set(prev);
      if (next.has(stat)) next.delete(stat);
      else next.add(stat);
      return next;
    });
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
                {u.name || u.id.slice(0, 16)} (DMG:{fmtDmg(u.stats.damage)} HP:{fmtHp(u.stats.hp)} Rate:{fmtRate(u.stats.attackRateMs)})
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
                  {u.name || u.id.slice(0, 16)} (DMG:{fmtDmg(u.stats.damage)} HP:{fmtHp(u.stats.hp)} Rate:{fmtRate(u.stats.attackRateMs)})
                </option>
              ))}
          </select>
          {parentBBusy && <span style={{ color: "#fa0", fontSize: 11, marginLeft: 4 }}>(in battle)</span>}
        </label>
      </div>

      {parentAUnit && parentBUnit && (
        <div style={{ fontSize: 11, color: "#888", marginBottom: 8, lineHeight: 1.6 }}>
          A: DMG {fmtDmg(parentAUnit.stats.damage)} | HP {fmtHp(parentAUnit.stats.hp)} | Rate {fmtRate(parentAUnit.stats.attackRateMs)}
          <br />
          B: DMG {fmtDmg(parentBUnit.stats.damage)} | HP {fmtHp(parentBUnit.stats.hp)} | Rate {fmtRate(parentBUnit.stats.attackRateMs)}
        </div>
      )}

      {/* Speed controls */}
      <div style={{ marginBottom: 8, display: "flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#888", marginRight: 4 }}>Speed:</span>
        {[1, 2, 5, 10, 50].map((s) => (
          <button
            key={s}
            onClick={() => setBreedSpeed(s)}
            style={{
              padding: "2px 8px",
              fontSize: 12,
              background: breedSpeed === s ? "#446" : "#333",
              border: breedSpeed === s ? "1px solid #88f" : "1px solid #555",
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Variation control */}
      <div style={{ marginBottom: 8, display: "flex", gap: 4, alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#888" }}>
          Variation: ±
          <input
            type="number"
            value={variationPct}
            min={0}
            max={100}
            step={0.1}
            onChange={(e) => setVariationPct(Math.max(0, Math.min(100, Number(e.target.value))))}
            style={{ width: 55, marginLeft: 4, fontSize: 12 }}
          />
          %
        </label>
      </div>

      <div style={{ marginBottom: 8, minHeight: 62 }}>
        {breeding ? (
          <>
            <p style={{ fontSize: 13, margin: "0 0 4px" }}>Breeding in progress... ({Math.round(breeding.durationMs / 1000)}s)</p>
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
            <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{Math.round(progress)}%</p>
          </>
        ) : (
          <button
            onClick={handleStart}
            disabled={!canStart}
          >
            Start Breeding ({Math.round(BREEDING_DURATION_MS / breedSpeed / 1000)}s)
          </button>
        )}
      </div>

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

            {/* No-regression guard */}
            {keyStat !== "none" && (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={noRegressionGuard}
                    onChange={(e) => setNoRegressionGuard(e.target.checked)}
                  />
                  <span style={{ fontSize: 12 }}>Don't replace if these stats regress</span>
                </label>

                {noRegressionGuard && (
                  <div style={{ marginLeft: 20, display: "flex", flexDirection: "column", gap: 3 }}>
                    {ALL_STATS.map((s) => (
                      <label key={s} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={guardedStats.has(s)}
                          onChange={() => toggleGuardedStat(s)}
                        />
                        <span style={{ fontSize: 11, color: "#aaa" }}>
                          {statLabel(s)}
                          {parentAUnit && parentBUnit && (
                            <span style={{ color: "#666", marginLeft: 4 }}>
                              (A: {fmtStatByKey(s, parentAUnit.stats[s])}, B: {fmtStatByKey(s, parentBUnit.stats[s])})
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

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
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={keepIfEquivalent}
                    onChange={(e) => setKeepIfEquivalent(e.target.checked)}
                  />
                  <span style={{ fontSize: 11, color: "#aaa" }}>Keep if not inferior on guarded stats</span>
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
