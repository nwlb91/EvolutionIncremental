import { allMutations } from "../engine/mutations";
import type { MutationRarity } from "../engine/units";

function rarityColor(rarity: MutationRarity): string {
  switch (rarity) {
    case "legendary": return "#fa0";
    case "rare": return "#48f";
    default: return "#aaa";
  }
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

export function MutationGlossary() {
  const mutations = allMutations();
  const grouped: Record<MutationRarity, typeof mutations> = { common: [], rare: [], legendary: [] };
  for (const m of mutations) grouped[m.rarity].push(m);

  return (
    <div>
      <h2>Mutation Glossary</h2>
      {(["common", "rare", "legendary"] as MutationRarity[]).map((rarity) => (
        <div key={rarity} style={{ marginBottom: 12 }}>
          <h3 style={{ color: rarityColor(rarity), fontSize: 14, marginBottom: 4, textTransform: "capitalize" }}>
            {rarity} ({grouped[rarity].length})
          </h3>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "#888" }}>
                <th style={{ textAlign: "left", padding: "2px 6px" }}>Name</th>
                <th style={{ textAlign: "left", padding: "2px 6px" }}>T1 Range</th>
                <th style={{ textAlign: "left", padding: "2px 6px" }}>Max Tier</th>
              </tr>
            </thead>
            <tbody>
              {grouped[rarity].map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid #222" }}>
                  <td style={{ padding: "3px 6px" }}>{m.name}</td>
                  <td style={{ padding: "3px 6px", color: "#888" }}>
                    {pct(m.baseRange[0])} – {pct(m.baseRange[1])}
                  </td>
                  <td style={{ padding: "3px 6px", color: "#888" }}>
                    {m.maxTier ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
