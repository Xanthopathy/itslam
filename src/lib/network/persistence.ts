import type { GameState } from "../types";

const STORAGE_PREFIX = "itslam_game_state:";

function storageKey(roomCode: string): string {
  return `${STORAGE_PREFIX}${roomCode}`;
}

export function saveGameStateSnapshot(state: GameState): void {
  if (!state.roomCode || typeof localStorage === "undefined") return;

  localStorage.setItem(storageKey(state.roomCode), JSON.stringify(state));
}

export function loadGameStateSnapshot(roomCode: string): GameState | undefined {
  if (typeof localStorage === "undefined") return undefined;

  const raw = localStorage.getItem(storageKey(roomCode));
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as GameState;
    if (
      typeof parsed.stateVersion !== "number" ||
      !Array.isArray(parsed.players) ||
      !Array.isArray(parsed.drawPile) ||
      !Array.isArray(parsed.discardPile)
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    localStorage.removeItem(storageKey(roomCode));
    return undefined;
  }
}