import { useState } from "react";
import type { Unit } from "../engine/units";
import type { Rental } from "../engine/rentals";
import { ENEMY_LADDER, enemyToCombatant } from "../engine/enemies";
import { resolveBattle, type BattleResult } from "../engine/combat";
import { battleReward, rentalBattleFee, netRentalWinnings } from "../engine/economy";
import type { GameAction } from "../engine/state";

interface Props {
  roster: Record<string, Unit>;
  rentals: Record<string, Rental>;
  money: number;
  dispatch: (a: GameAction) => void;
}

export function CombatPanel({ roster, rentals, money, dispatch }: Props) {
  const [unitId, setUnitId] = useState("");
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [lastReward, setLastReward] = useState(0);

  const allUnits: (Unit & { isRental?: boolean })[] = [
    ...Object.values(roster),
    ...Object.values(rentals).map((r) => ({ ...r.unit, isRental: true })),
  ];

  const handleFight = () => {
    const unit = allUnits.find((u) => u.id === unitId);
    if (!unit) return;

    const isRental = !!rentals[unitId];
    const fee = isRental ? rentalBattleFee() : 0;

    if (money < fee) return; // can't afford rental fee

    if (fee > 0) {
      dispatch({ type: "SPEND_MONEY", amount: fee });
    }

    const enemy = ENEMY_LADDER[enemyIdx];
    const combatantLeft = { id: unit.id, stats: unit.stats };
    const combatantRight = enemyToCombatant(enemy);
    const battleResult = resolveBattle(combatantLeft, combatantRight);
    setResult(battleResult);

    if (battleResult.winnerIndex === 0) {
      const gross = battleReward(enemy);
      const reward = isRental ? netRentalWinnings(gross) : gross;
      setLastReward(reward);
      dispatch({ type: "ADD_MONEY", amount: reward });
      dispatch({ type: "UPDATE_HIGHEST_TIER", tier: enemy.tier });
    } else {
      setLastReward(0);
    }
  };

  return (
    <div>
      <h2>Combat</h2>
      <label>
        Fighter:{" "}
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">-- select --</option>
          {allUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {rentals[u.id] ? "[R] " : ""}
              {u.name || u.id.slice(0, 16)} (DMG:{u.stats.damage} HP:{u.stats.hp})
            </option>
          ))}
        </select>
      </label>
      <br />
      <label>
        Enemy:{" "}
        <select value={enemyIdx} onChange={(e) => setEnemyIdx(Number(e.target.value))}>
          {ENEMY_LADDER.map((e, i) => (
            <option key={e.id} value={i}>
              {e.name} (DMG:{e.stats.damage} HP:{e.stats.hp} Rate:{e.stats.attackRateMs}ms)
            </option>
          ))}
        </select>
      </label>
      <br />
      {rentals[unitId] && <p style={{ color: "#fa0" }}>Rental fee: ${rentalBattleFee()}</p>}
      <button onClick={handleFight} disabled={!unitId}>
        Fight!
      </button>

      {result && (
        <div style={{ marginTop: 8, padding: 8, background: "#222", borderRadius: 4 }}>
          <p>
            <strong>
              {result.outcome === "left_wins"
                ? "Victory!"
                : result.outcome === "right_wins"
                ? "Defeat."
                : "Draw."}
            </strong>{" "}
            ({result.ticks} ticks)
          </p>
          {result.winnerIndex === 0 && <p style={{ color: "#0f0" }}>+${lastReward}</p>}
          <details>
            <summary>Battle log ({result.log.length} ticks)</summary>
            <div style={{ maxHeight: 200, overflow: "auto", fontSize: 12, fontFamily: "monospace" }}>
              {result.log
                .filter((t) => t.attackerId)
                .map((t) => (
                  <div key={t.tick}>
                    T{t.tick}: {t.attackerId} deals {t.damage} dmg → [{t.combatants[0].hp}/{t.combatants[0].maxHp}] vs [{t.combatants[1].hp}/{t.combatants[1].maxHp}]
                  </div>
                ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
