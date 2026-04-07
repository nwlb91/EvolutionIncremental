import { useState } from "react";
import type { Sphere } from "../engine/units";
import type { GameAction } from "../engine/state";
import type { RNG } from "../engine/rng";
import { prospect, spawnCarrier, mergeSpheres } from "../engine/spheres";
import { getMutation } from "../engine/mutations";
import { Tooltip } from "./Tooltip";

interface Props {
  spheres: Record<string, Sphere>;
  money: number;
  dispatch: (a: GameAction) => void;
  rng: RNG;
}

export function SpheresPanel({ spheres, money, dispatch, rng }: Props) {
  const [budget, setBudget] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleProspect = () => {
    if (money < budget || budget <= 0) return;
    dispatch({ type: "SPEND_MONEY", amount: budget });
    const results = prospect(budget, rng);
    dispatch({ type: "UPDATE_RNG_STATE", state: rng.state() });
    dispatch({ type: "ADD_SPHERES", spheres: results });
  };

  const handleUse = (sphere: Sphere) => {
    const carrier = spawnCarrier(sphere);
    dispatch({ type: "ADD_UNIT", unit: carrier });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMerge = () => {
    const ids = Array.from(selectedIds);
    if (ids.length !== 2) return;
    const a = spheres[ids[0]];
    const b = spheres[ids[1]];
    if (!a || !b) return;
    const result = mergeSpheres(a, b);
    if (!result) return;
    dispatch({ type: "MERGE_SPHERES", sphereIdA: a.id, sphereIdB: b.id, result });
    setSelectedIds(new Set());
  };

  // Group spheres by mutation
  const sphereList = Object.values(spheres);
  const grouped = new Map<string, Sphere[]>();
  for (const s of sphereList) {
    const list = grouped.get(s.mutationId) ?? [];
    list.push(s);
    grouped.set(s.mutationId, list);
  }

  // Check if merge is valid
  const selectedArr = Array.from(selectedIds);
  const canMerge =
    selectedArr.length === 2 &&
    spheres[selectedArr[0]] &&
    spheres[selectedArr[1]] &&
    spheres[selectedArr[0]].mutationId === spheres[selectedArr[1]].mutationId &&
    spheres[selectedArr[0]].tier === spheres[selectedArr[1]].tier;

  return (
    <div>
      {/* Prospecting */}
      <h2>Prospecting</h2>
      <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <label>
          Budget: $
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            style={{ width: 120, verticalAlign: "middle" }}
          />
          <span style={{ marginLeft: 4 }}>{budget}</span>
        </label>
        <button onClick={handleProspect} disabled={money < budget || budget <= 0}>
          Prospect (${budget})
        </button>
      </div>

      {/* Sphere Collection */}
      <h2>Sphere Collection ({sphereList.length})</h2>

      {sphereList.length === 0 && <p style={{ color: "#666" }}>No Spheres yet. Run a prospect to find some.</p>}

      {Array.from(grouped.entries()).map(([mutId, list]) => {
        const def = getMutation(mutId);
        return (
          <div key={mutId} style={{ marginBottom: 10, padding: 8, background: "#1a1a2e", borderRadius: 6, border: "1px solid #333" }}>
            <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 4, color: rarityColor(def.rarity) }}>
              <Tooltip text={def.description}>
                <span style={{ borderBottom: "1px dotted #555" }}>{def.name}</span>
              </Tooltip>{" "}
              <span style={{ fontSize: 11, color: "#888" }}>({def.rarity})</span>
            </div>
            {list
              .sort((a, b) => b.tier - a.tier)
              .map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    marginBottom: 3,
                    padding: "2px 4px",
                    background: selectedIds.has(s.id) ? "#334" : "transparent",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                  onClick={() => toggleSelect(s.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span style={{ fontSize: 12 }}>Tier {s.tier}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUse(s); }}
                    style={{ fontSize: 11, padding: "1px 6px" }}
                  >
                    Use
                  </button>
                </div>
              ))}
          </div>
        );
      })}

      {selectedArr.length === 2 && (
        <button onClick={handleMerge} disabled={!canMerge} style={{ marginTop: 4 }}>
          Merge Selected{canMerge ? ` → Tier ${spheres[selectedArr[0]].tier + 1}` : " (must be same mutation & tier)"}
        </button>
      )}
    </div>
  );
}

function rarityColor(rarity: string): string {
  switch (rarity) {
    case "legendary": return "#fa0";
    case "rare": return "#48f";
    default: return "#aaa";
  }
}
