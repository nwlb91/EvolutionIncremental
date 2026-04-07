import type { GameState } from "../engine/state";

/**
 * Abstract save/load interface.
 * localStorage today, IndexedDB / cloud / file system tomorrow.
 */
export interface SaveAdapter {
  save(state: GameState): Promise<void>;
  load(): Promise<GameState | null>;
  clear(): Promise<void>;
}

const SAVE_KEY = "evolution_incremental_save";

/** Default localStorage implementation. */
export class LocalStorageSaveAdapter implements SaveAdapter {
  async save(state: GameState): Promise<void> {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  async load(): Promise<GameState | null> {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(SAVE_KEY);
  }
}
