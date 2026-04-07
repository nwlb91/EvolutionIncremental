import { useState, useEffect, useRef, useCallback } from "react";
import { fmtStat, type Unit } from "../engine/units";
import type { Rental } from "../engine/rentals";
import { ENEMY_LADDER, enemyToCombatant } from "../engine/enemies";
import type { EnemyDefinition } from "../engine/enemies";
import { resolveBattle, type BattleResult, type CombatTick } from "../engine/combat";
import { COMBAT_TICK_MS, COMBAT_PLAYBACK_SPEED } from "../engine/balance";
import { battleReward, rentalBattleFee, netRentalWinnings } from "../engine/economy";
import type { GameAction } from "../engine/state";

type Phase = "setup" | "playing" | "result";

interface Props {
  roster: Record<string, Unit>;
  rentals: Record<string, Rental>;
  money: number;
  dispatch: (a: GameAction) => void;
  excludeUnitIds: Set<string>;
  onBattlingUnitChange: (id: string | null) => void;
}

// ── Sub-components ──

function Bar({
  value,
  max,
  color,
  height = 18,
  label,
}: {
  value: number;
  max: number;
  color: string;
  height?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      style={{
        position: "relative",
        background: "#333",
        height,
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #555",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${pct}%`,
          background: color,
          transition: `width ${COMBAT_TICK_MS / COMBAT_PLAYBACK_SPEED}ms linear`,
        }}
      />
      {label && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: "bold",
            color: "#fff",
            textShadow: "0 0 3px #000",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function FighterCard({
  name,
  tick,
  index,
  attackRateMs,
  flash,
}: {
  name: string;
  tick: CombatTick;
  index: 0 | 1;
  attackRateMs: number;
  flash: "hit" | "attack" | null;
}) {
  const c = tick.combatants[index];
  let borderColor = "#555";
  if (flash === "hit") borderColor = "#f44";
  else if (flash === "attack") borderColor = "#4f4";

  return (
    <div
      style={{
        flex: 1,
        padding: 10,
        background: "#1a1a2e",
        borderRadius: 6,
        border: `2px solid ${borderColor}`,
        transition: "border-color 0.1s",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 6, fontSize: 14, color: "#ccc" }}>
        {name}
      </div>
      <div style={{ marginBottom: 4, fontSize: 11, color: "#888" }}>HP</div>
      <Bar
        value={c.hp}
        max={c.maxHp}
        color={c.hp / c.maxHp > 0.5 ? "#2d8" : c.hp / c.maxHp > 0.2 ? "#da0" : "#e33"}
        height={22}
        label={`${fmtStat(c.hp)} / ${fmtStat(c.maxHp)}`}
      />
      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 11, color: "#888" }}>
        Cooldown
      </div>
      <Bar value={attackRateMs - c.timerMs} max={attackRateMs} color="#38f" height={14} />
      {flash === "attack" && (
        <div style={{ marginTop: 4, fontSize: 12, color: "#4f4", fontWeight: "bold" }}>
          HIT! -{tick.damage}
        </div>
      )}
      {flash === "hit" && c.hp > 0 && (
        <div style={{ marginTop: 4, fontSize: 12, color: "#f44" }}>
          Took damage!
        </div>
      )}
      {c.hp <= 0 && (
        <div style={{ marginTop: 4, fontSize: 13, color: "#f44", fontWeight: "bold" }}>
          DEFEATED
        </div>
      )}
    </div>
  );
}

// ── Main component ──

export function CombatPanel({ roster, rentals, money, dispatch, excludeUnitIds, onBattlingUnitChange }: Props) {
  const [unitId, setUnitId] = useState("");
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("setup");
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [currentTickIdx, setCurrentTickIdx] = useState(0);
  const [lastReward, setLastReward] = useState(0);
  const [speed, setSpeed] = useState(COMBAT_PLAYBACK_SPEED);
  const [autoBattle, setAutoBattle] = useState(false);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [battleCount, setBattleCount] = useState(0);

  const [leftName, setLeftName] = useState("");
  const [rightName, setRightName] = useState("");
  const [leftRate, setLeftRate] = useState(1000);
  const [rightRate, setRightRate] = useState(1000);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allUnits: Unit[] = [
    ...Object.values(roster),
    ...Object.values(rentals).map((r) => r.unit),
  ].filter((u) => !excludeUnitIds.has(u.id));

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupAuto = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => { cleanup(); cleanupAuto(); }, [cleanup, cleanupAuto]);

  // Report battling unit to parent
  useEffect(() => {
    if (phase === "playing") {
      onBattlingUnitChange(unitId);
    } else {
      onBattlingUnitChange(null);
    }
  }, [phase, unitId, onBattlingUnitChange]);

  const runFight = useCallback(() => {
    const unit = allUnits.find((u) => u.id === unitId);
    if (!unit) return;

    const isRental = !!rentals[unitId];
    const fee = isRental ? rentalBattleFee() : 0;
    if (money < fee) return;

    if (fee > 0) {
      dispatch({ type: "SPEND_MONEY", amount: fee });
    }

    const enemy: EnemyDefinition = ENEMY_LADDER[enemyIdx];
    const combatantLeft = { id: unit.id, stats: unit.stats };
    const combatantRight = enemyToCombatant(enemy);
    const result = resolveBattle(combatantLeft, combatantRight);

    setBattleResult(result);
    setCurrentTickIdx(0);
    setLeftName(unit.name || unit.id.slice(0, 12));
    setRightName(enemy.name);
    setLeftRate(unit.stats.attackRateMs);
    setRightRate(enemy.stats.attackRateMs);
    setPhase("playing");

    if (result.winnerIndex === 0) {
      const gross = battleReward(enemy);
      const reward = isRental ? netRentalWinnings(gross) : gross;
      setLastReward(reward);
      setTotalWinnings((prev) => prev + reward);
      dispatch({ type: "ADD_MONEY", amount: reward });
      dispatch({ type: "UPDATE_HIGHEST_TIER", tier: enemy.tier });
    } else {
      setLastReward(0);
    }
    setBattleCount((prev) => prev + 1);
  }, [allUnits, unitId, rentals, money, dispatch, enemyIdx]);

  // Playback timer
  useEffect(() => {
    if (phase !== "playing" || !battleResult) return;
    cleanup();

    const intervalMs = COMBAT_TICK_MS / speed;
    timerRef.current = setInterval(() => {
      setCurrentTickIdx((prev) => {
        const next = prev + 1;
        if (next >= battleResult.log.length) {
          cleanup();
          setPhase("result");
          return prev;
        }
        return next;
      });
    }, intervalMs);

    return cleanup;
  }, [phase, battleResult, speed, cleanup]);

  // Auto-battle: when result phase is reached and auto is on, start next fight
  useEffect(() => {
    if (phase !== "result" || !autoBattle) return;
    cleanupAuto();

    autoTimerRef.current = setTimeout(() => {
      runFight();
    }, 300);

    return cleanupAuto;
  }, [phase, autoBattle, cleanupAuto, runFight]);

  const currentTick: CombatTick | null =
    battleResult && battleResult.log[currentTickIdx] ? battleResult.log[currentTickIdx] : null;

  const leftFlash: "hit" | "attack" | null = currentTick?.attackerId
    ? currentTick.attackerId === currentTick.combatants[0].id
      ? "attack"
      : "hit"
    : null;
  const rightFlash: "hit" | "attack" | null = currentTick?.attackerId
    ? currentTick.attackerId === currentTick.combatants[1].id
      ? "attack"
      : "hit"
    : null;

  // Check if selected unit is excluded (busy breeding)
  const unitBusy = !!unitId && excludeUnitIds.has(unitId);

  // ── Render ──

  if (phase === "setup") {
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
                {u.name || u.id.slice(0, 16)} (DMG:{fmtStat(u.stats.damage)} HP:{fmtStat(u.stats.hp)})
              </option>
            ))}
          </select>
          {unitBusy && <span style={{ color: "#fa0", fontSize: 11, marginLeft: 4 }}>(breeding)</span>}
        </label>
        <br />
        <label>
          Enemy:{" "}
          <select value={enemyIdx} onChange={(e) => setEnemyIdx(Number(e.target.value))}>
            {ENEMY_LADDER.map((e, i) => (
              <option key={e.id} value={i}>
                {e.name} (DMG:{fmtStat(e.stats.damage)} HP:{fmtStat(e.stats.hp)} Rate:{fmtStat(e.stats.attackRateMs)}ms)
              </option>
            ))}
          </select>
        </label>
        <br />
        {rentals[unitId] && <p style={{ color: "#fa0" }}>Rental fee: ${rentalBattleFee()}</p>}
        <button onClick={runFight} disabled={!unitId || unitBusy} style={{ marginTop: 8 }}>
          Fight!
        </button>

        {/* Auto-battle controls */}
        <div style={{ marginTop: 8, padding: 8, background: "#1a1a2e", borderRadius: 6, border: "1px solid #333" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoBattle}
              onChange={(e) => {
                setAutoBattle(e.target.checked);
                if (!e.target.checked) {
                  setTotalWinnings(0);
                  setBattleCount(0);
                }
              }}
            />
            <span style={{ fontSize: 13 }}>Auto-battle</span>
          </label>
          {autoBattle && (
            <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
              Will auto-start next fight after each battle ends.
            </p>
          )}
        </div>
      </div>
    );
  }

  if ((phase === "playing" || phase === "result") && battleResult && currentTick) {
    const progressPct = ((currentTickIdx + 1) / battleResult.log.length) * 100;

    return (
      <div>
        <h2>Combat</h2>

        {/* Speed controls */}
        <div style={{ marginBottom: 8, display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#888", marginRight: 4 }}>Speed:</span>
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: "2px 8px",
                fontSize: 12,
                background: speed === s ? "#446" : "#333",
                border: speed === s ? "1px solid #88f" : "1px solid #555",
              }}
            >
              {s}x
            </button>
          ))}
          {phase === "playing" && (
            <button
              onClick={() => {
                cleanup();
                setCurrentTickIdx(battleResult.log.length - 1);
                setPhase("result");
              }}
              style={{ marginLeft: 8, padding: "2px 8px", fontSize: 12 }}
            >
              Skip
            </button>
          )}
          {autoBattle && (
            <button
              onClick={() => {
                setAutoBattle(false);
                cleanup();
                cleanupAuto();
                setPhase("setup");
                setBattleResult(null);
              }}
              style={{ marginLeft: "auto", padding: "2px 8px", fontSize: 12, color: "#f44" }}
            >
              Stop Auto
            </button>
          )}
        </div>

        {/* Auto-battle stats */}
        {autoBattle && battleCount > 0 && (
          <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
            Battles: {battleCount} | Total earned: ${totalWinnings}
          </div>
        )}

        {/* Arena */}
        <div style={{ display: "flex", gap: 12 }}>
          <FighterCard
            name={leftName}
            tick={currentTick}
            index={0}
            attackRateMs={leftRate}
            flash={leftFlash}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 20,
              fontWeight: "bold",
              color: "#666",
            }}
          >
            VS
          </div>
          <FighterCard
            name={rightName}
            tick={currentTick}
            index={1}
            attackRateMs={rightRate}
            flash={rightFlash}
          />
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ background: "#222", height: 4, borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "#666",
                transition: `width ${COMBAT_TICK_MS / speed}ms linear`,
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            Tick {currentTickIdx + 1} / {battleResult.log.length}
          </div>
        </div>

        {/* Result banner (only show if not auto-battling, since auto moves on quickly) */}
        {phase === "result" && !autoBattle && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background:
                battleResult.winnerIndex === 0
                  ? "rgba(0,180,0,0.15)"
                  : battleResult.winnerIndex === 1
                  ? "rgba(180,0,0,0.15)"
                  : "rgba(180,180,0,0.15)",
              borderRadius: 6,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: "bold" }}>
              {battleResult.outcome === "left_wins"
                ? "VICTORY"
                : battleResult.outcome === "right_wins"
                ? "DEFEAT"
                : "DRAW"}
            </div>
            {battleResult.winnerIndex === 0 && lastReward > 0 && (
              <div style={{ color: "#0f0", fontSize: 16, marginTop: 4 }}>+${lastReward}</div>
            )}
            <button
              onClick={() => {
                setPhase("setup");
                setBattleResult(null);
              }}
              style={{ marginTop: 8 }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
