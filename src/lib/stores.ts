// src/lib/stores.ts
import { writable } from "svelte/store";
import type { GameState, Player, Card, Sheep } from "./types";

// Game state reactive store
export const gameState = writable<GameState>({
  players: [],
  drawPile: [],
  discardPile: [],
  currentTurnPlayerId: "",
});

// UI state
export const uiState = writable({
  gameStarted: false,
  selectedCards: [] as string[], // card IDs
  selectedSheepIndex: -1,
  targetMode: null as "player" | "sheep" | null,
  targetPlayerId: "",
  showCoinFlipModal: false,
  coinFlipCard: null as Card | null,
  coinFlipTargetPlayerId: "",
  gameLog: [] as { timestamp: number; message: string }[],
  playerCount: 2,
});

// Player names for lobby
export const playerNames = writable<string[]>([]);

// Current player's ID (for perspective)
export const currentPlayerid = writable<string>("");

// Game over state
export const gameOverState = writable({
  isGameOver: false,
  winners: [] as Player[],
  scores: {} as Record<string, number>,
});

// Helper: Add message to log
export const addGameLog = (message: string) => {
  uiState.update((state) => ({
    ...state,
    gameLog: [...state.gameLog, { timestamp: Date.now(), message }],
  }));
};
