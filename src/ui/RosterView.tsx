import type { Unit } from "../engine/units";
import type { GameAction } from "../engine/state";

interface Props {
  roster: Record<string, Unit>;
  dispatch: (a: GameAction) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RosterView({ roster, dispatch, selectedId, onSelect }: Props) {
  const units = Object.values(roster);

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
              <td>{u.stats.damage}</td>
              <td>{u.stats.hp}</td>
              <td>{u.stats.attackRateMs}</td>
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
    </div>
  );
}
