import { useReducer, useCallback, useEffect, useRef } from "react";
import { gameReducer, createInitialState, type GameState, type GameAction } from "../engine/state";
import { createRNG, type RNG } from "../engine/rng";
import { createStarterUnit } from "../engine/units";
import { STARTING_MONEY, AUTOSAVE_INTERVAL_MS } from "../engine/balance";
import { type SaveAdapter } from "../persistence/adapter";

export interface GameContext {
  state: GameState;
  dispatch: (action: GameAction) => void;
  rng: RNG;
  save: () => Promise<void>;
  resetGame: () => Promise<void>;
}

export function useGame(adapter: SaveAdapter): GameContext | null {
  const [state, dispatch] = useReducer(gameReducer, null as unknown as GameState);
  const rngRef = useRef<RNG | null>(null);
  const initializedRef = useRef(false);

  // Initialize: try to load save, else create new game
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      const saved = await adapter.load();
      if (saved) {
        rngRef.current = createRNG(saved.rngState);
        dispatch({ type: "LOAD_STATE", state: saved });
      } else {
        const seed = Date.now();
        const rng = createRNG(seed);
        rngRef.current = rng;

        const initial = createInitialState(seed);
        initial.money = STARTING_MONEY;
        // Give player two starter units
        const u1 = createStarterUnit(rng);
        const u2 = createStarterUnit(rng);
        initial.roster[u1.id] = u1;
        initial.roster[u2.id] = u2;
        initial.rngState = rng.state();

        dispatch({ type: "LOAD_STATE", state: initial });
      }
    })();
  }, [adapter]);

  // Autosave
  const save = useCallback(async () => {
    if (!state || !rngRef.current) return;
    const toSave: GameState = { ...state, rngState: rngRef.current.state(), lastSaved: Date.now() };
    await adapter.save(toSave);
    dispatch({ type: "SET_LAST_SAVED", timestamp: toSave.lastSaved });
  }, [state, adapter]);

  useEffect(() => {
    if (!state) return;
    const id = setInterval(save, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [save, state]);

  const resetGame = useCallback(async () => {
    await adapter.clear();
    const seed = Date.now();
    const rng = createRNG(seed);
    rngRef.current = rng;

    const initial = createInitialState(seed);
    initial.money = STARTING_MONEY;
    const u1 = createStarterUnit(rng);
    const u2 = createStarterUnit(rng);
    initial.roster[u1.id] = u1;
    initial.roster[u2.id] = u2;
    initial.rngState = rng.state();

    dispatch({ type: "LOAD_STATE", state: initial });
  }, [adapter]);

  if (!state || !rngRef.current) return null;

  return { state, dispatch, rng: rngRef.current, save, resetGame };
}
