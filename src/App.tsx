import { useMemo, useState, useCallback } from "react";
import { useGame } from "./ui/useGame";
import { MoneyDisplay } from "./ui/MoneyDisplay";
import { RosterView } from "./ui/RosterView";
import { BreedingPanel } from "./ui/BreedingPanel";
import { CombatPanel } from "./ui/CombatPanel";
import { SpheresPanel } from "./ui/SpheresPanel";
import { MutationGlossary } from "./ui/MutationGlossary";
import { LocalStorageSaveAdapter } from "./persistence/adapter";

export default function App() {
  const adapter = useMemo(() => new LocalStorageSaveAdapter(), []);
  const game = useGame(adapter);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  // Track which units are busy in each activity
  const [breedingUnitIds, setBreedingUnitIds] = useState<Set<string>>(new Set());
  const [battlingUnitId, setBattlingUnitId] = useState<string | null>(null);

  const onBreedingUnitsChange = useCallback((ids: Set<string>) => {
    setBreedingUnitIds(ids);
  }, []);

  const onBattlingUnitChange = useCallback((id: string | null) => {
    setBattlingUnitId(id);
  }, []);

  if (!game) return <p>Loading...</p>;

  const { state, dispatch, rng } = game;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "monospace", color: "#eee", background: "#111", minHeight: "100vh" }}>
      <h1>Evolution Incremental</h1>
      <MoneyDisplay money={state.money} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div>
          <RosterView
            roster={state.roster}
            dispatch={dispatch}
            selectedId={selectedUnit}
            onSelect={setSelectedUnit}
          />
        </div>
        <div>
          <CombatPanel
            roster={state.roster}
            money={state.money}
            dispatch={dispatch}
            excludeUnitIds={breedingUnitIds}
            onBattlingUnitChange={onBattlingUnitChange}
          />
        </div>
        <div>
          <BreedingPanel
            roster={state.roster}
            breeding={state.breeding}
            dispatch={dispatch}
            rng={rng}
            excludeUnitIds={battlingUnitId ? new Set([battlingUnitId]) : new Set()}
            onBreedingUnitsChange={onBreedingUnitsChange}
          />
        </div>
        <div>
          <SpheresPanel spheres={state.spheres} money={state.money} dispatch={dispatch} rng={rng} />
        </div>
        <div>
          <MutationGlossary />
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => game.save()}>Save Now</button>
        {state.lastSaved > 0 && <span>Last saved: {new Date(state.lastSaved).toLocaleTimeString()}</span>}
        <button
          onClick={() => {
            if (window.confirm("Reset all progress? This cannot be undone.")) {
              game.resetGame();
            }
          }}
          style={{ marginLeft: "auto", color: "#f44", border: "1px solid #f44" }}
        >
          Reset Save
        </button>
      </div>
    </div>
  );
}
