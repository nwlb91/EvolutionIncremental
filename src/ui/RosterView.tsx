import { fmtDmg, fmtHp, fmtRate, type Unit } from "../engine/units";
import type { GameAction } from "../engine/state";
import { getMutation } from "../engine/mutations";
import { tierValueRange } from "../engine/spheres";
import { Tooltip } from "./Tooltip";

interface Props {
  roster: Record<string, Unit>;
  dispatch: (a: GameAction) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RosterView({ roster, dispatch, selectedId, onSelect }: Props) {
  const units = Object.values(roster);
  const selected = selectedId ? roster[selectedId] ?? null : null;

  return (
    <div>
      <h2>Roster ({units.length})</h2>
      {units.length === 0 && <p>No units yet.</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>DMG</th>
            <th>HP</th>
            <th>Rate (ms)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr
              key={u.id}
              onClick={() => onSelect(u.id)}
              style={{
                cursor: "pointer",
                background: u.id === selectedId ? "#335" : "transparent",
              }}
            >
              <td>
                <input
                  type="radio"
                  checked={u.id === selectedId}
                  onChange={() => onSelect(u.id)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={u.name}
                  placeholder={u.id.slice(0, 12)}
                  onChange={(e) =>
                    dispatch({ type: "RENAME_UNIT", unitId: u.id, name: e.target.value })
                  }
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 100, background: "#111", color: "#eee", border: "1px solid #444" }}
                />
              </td>
              <td>{fmtDmg(u.stats.damage)}</td>
              <td>{fmtHp(u.stats.hp)}</td>
              <td>{fmtRate(u.stats.attackRateMs)}</td>
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "REMOVE_UNIT", unitId: u.id });
                    if (selectedId === u.id) onSelect("");
                  }}
                  style={{ color: "#f44", fontSize: 11, padding: "2px 6px" }}
                >
                  Dismiss
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <UnitDetail unit={selected} />
      )}
    </div>
  );
}

function pct(v: number): string {
  return (v * 100).toFixed(2) + "%";
}

function rarityColor(rarity: string): string {
  switch (rarity) {
    case "legendary": return "#fa0";
    case "rare": return "#48f";
    default: return "#aaa";
  }
}

function UnitDetail({ unit }: { unit: Unit }) {
  return (
    <div style={{ marginTop: 12, padding: 10, background: "#1a1a2e", borderRadius: 6, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
        {unit.name || unit.id.slice(0, 16)}
      </h3>

      <div style={{ fontSize: 12, marginBottom: 8 }}>
        <div>Damage: <strong>{fmtDmg(unit.stats.damage)}</strong></div>
        <div>HP: <strong>{fmtHp(unit.stats.hp)}</strong></div>
        <div>Attack Rate: <strong>{fmtRate(unit.stats.attackRateMs)}ms</strong></div>
      </div>

      <div style={{ fontSize: 12 }}>
        <strong>Mutations ({unit.mutations.length})</strong>
        {unit.mutations.length === 0 && (
          <p style={{ color: "#666", margin: "4px 0 0" }}>None</p>
        )}
        {unit.mutations.map((m) => {
          const def = getMutation(m.mutationId);
          const [minVal, maxVal] = tierValueRange(def.baseRange, m.tier);
          return (
            <div
              key={m.mutationId}
              style={{ marginTop: 4, padding: "4px 6px", background: "#111", borderRadius: 4 }}
            >
              <Tooltip text={def.description}>
                <span style={{ color: rarityColor(def.rarity), borderBottom: "1px dotted #555" }}>{def.name}</span>
              </Tooltip>
              <span style={{ color: "#888", marginLeft: 6 }}>
                T{m.tier}
              </span>
              <span style={{ color: "#aaa", marginLeft: 6 }}>
                Value: {pct(m.value)}
              </span>
              <span style={{ color: "#555", marginLeft: 6, fontSize: 11 }}>
                (range: {pct(minVal)} – {pct(maxVal)})
              </span>
            </div>
          );
        })}
      </div>

      {unit.parentIds.length > 0 && (
        <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
          Parents: {unit.parentIds.map((id) => id.slice(0, 12)).join(", ")}
        </div>
      )}
    </div>
  );
}
