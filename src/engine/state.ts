import type { Unit, Sphere } from "./units";
import type { BreedingOperation } from "./breeding";

// ── Persistence versioning ──

/** Bump this when the save shape changes. Old saves are discarded on mismatch. */
export const SAVE_VERSION = 2;

// ── Root game state ──

export interface GameState {
  /** Save format version — checked on load to discard incompatible saves. */
  saveVersion: number;

  /** Player's money. */
  money: number;

  /** All player-owned units (keyed by unit ID for O(1) lookup). */
  roster: Record<string, Unit>;

  /** Player's Sphere collection (keyed by Sphere id). */
  spheres: Record<string, Sphere>;

  /** In-progress breeding operation, or null if idle. */
  breeding: BreedingOperation | null;

  /** Highest enemy tier beaten (for tracking progress). */
  highestTierBeaten: number;

  /** RNG seed state (persisted so randomness is reproducible across saves). */
  rngState: number;

  /** Timestamp of last save. */
  lastSaved: number;
}

// ── Actions ──

export type GameAction =
  | { type: "ADD_UNIT"; unit: Unit }
  | { type: "REMOVE_UNIT"; unitId: string }
  | { type: "RENAME_UNIT"; unitId: string; name: string }
  | { type: "ADD_MONEY"; amount: number }
  | { type: "SPEND_MONEY"; amount: number }
  | { type: "START_BREEDING"; op: BreedingOperation }
  | { type: "COMPLETE_BREEDING"; child: Unit }
  | { type: "CANCEL_BREEDING" }
  | { type: "ADD_SPHERES"; spheres: Sphere[] }
  | { type: "REMOVE_SPHERE"; sphereId: string }
  | { type: "MERGE_SPHERES"; sphereIdA: string; sphereIdB: string; result: Sphere }
  | { type: "UPDATE_RNG_STATE"; state: number }
  | { type: "UPDATE_HIGHEST_TIER"; tier: number }
  | { type: "SET_LAST_SAVED"; timestamp: number }
  | { type: "LOAD_STATE"; state: GameState };

// ── Reducer ──

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ADD_UNIT":
      return {
        ...state,
        roster: { ...state.roster, [action.unit.id]: action.unit },
      };

    case "REMOVE_UNIT": {
      const { [action.unitId]: _, ...rest } = state.roster;
      return { ...state, roster: rest };
    }

    case "RENAME_UNIT":
      return {
        ...state,
        roster: {
          ...state.roster,
          [action.unitId]: {
            ...state.roster[action.unitId],
            name: action.name,
          },
        },
      };

    case "ADD_MONEY":
      return { ...state, money: state.money + action.amount };

    case "SPEND_MONEY":
      return { ...state, money: state.money - action.amount };

    case "START_BREEDING":
      return { ...state, breeding: action.op };

    case "COMPLETE_BREEDING":
      return {
        ...state,
        breeding: null,
        roster: { ...state.roster, [action.child.id]: action.child },
      };

    case "CANCEL_BREEDING":
      return { ...state, breeding: null };

    case "ADD_SPHERES": {
      const added: Record<string, Sphere> = {};
      for (const s of action.spheres) added[s.id] = s;
      return { ...state, spheres: { ...state.spheres, ...added } };
    }

    case "REMOVE_SPHERE": {
      const { [action.sphereId]: _, ...rest } = state.spheres;
      return { ...state, spheres: rest };
    }

    case "MERGE_SPHERES": {
      const { [action.sphereIdA]: _a, [action.sphereIdB]: _b, ...remaining } = state.spheres;
      return { ...state, spheres: { ...remaining, [action.result.id]: action.result } };
    }

    case "UPDATE_RNG_STATE":
      return { ...state, rngState: action.state };

    case "UPDATE_HIGHEST_TIER":
      return {
        ...state,
        highestTierBeaten: Math.max(state.highestTierBeaten, action.tier),
      };

    case "SET_LAST_SAVED":
      return { ...state, lastSaved: action.timestamp };

    case "LOAD_STATE":
      return { ...action.state };

    default:
      return state;
  }
}

// ── Initial state factory ──

export function createInitialState(rngSeed: number): GameState {
  return {
    saveVersion: SAVE_VERSION,
    money: 0, // will be set by economy/STARTING_MONEY during game init
    roster: {},
    spheres: {},
    breeding: null,
    highestTierBeaten: -1,
    rngState: rngSeed,
    lastSaved: 0,
  };
}
