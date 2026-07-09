// src/lib/game/scoring.ts
import type { GameState, Player } from "$lib/types";
import { calculateSheepValue } from "$lib/game/sheep";
import { findPlayerById, log } from "$lib/game/utils";

/**
 * Check if game is over
 * - Final round active + all players have taken final turn
 */
export function isGameOver(state: GameState): boolean {
  if (!state.isFinalRound) return false;

  if (state.finalRoundTriggeredBy === undefined) return false;

  return state.currentTurnPlayerId === state.finalRoundTriggeredBy;
}

/**
 * Trigger final round when draw pile empties
 * Mark game state as in final round
 * The final round marker is shifted to the next player so the drawer who emptied
 * the pile still gets a normal turn now, then gets their final-round turn once
 * play loops back around.
 */
export function triggerFinalRound(state: GameState): void {
  if (state.isFinalRound) return;

  state.isFinalRound = true;
  const currentIndex = state.players.findIndex(
    (player) => player.id === state.currentTurnPlayerId,
  );
  const nextIndex =
    currentIndex === -1 ? -1 : (currentIndex + 1) % state.players.length;
  state.finalRoundTriggeredBy =
    nextIndex === -1 ? state.currentTurnPlayerId : state.players[nextIndex]?.id;
  const trigger = findPlayerById(state, state.currentTurnPlayerId);
  log(
    state,
    `The draw pile is empty! ${trigger?.name ?? "A player"} set up the final round`,
  );
}

/**
 * Get game score for all players:
 * - +1 per standard sheep on field
 * - +2 per full rainbow sheep on field
 * - -3 per ITSLAM card in hand
 * Return Record<playerName, score>
 */
export function getGameScore(state: GameState): Record<string, number> {
  const score: Record<string, number> = {};
  state.players.forEach((player) => {
    const sheepScore = player.field.reduce(
      (accumulator, sheep) => accumulator + calculateSheepValue(sheep),
      0,
    );
    const itslamPenalty =
      player.hand.filter((card) => card.type === "itslam").length * 3;
    score[player.name] = sheepScore - itslamPenalty;
  });
  return score;
}

/**
 * Get winner(s) - player(s) with highest score
 */
export function getWinner(state: GameState): Player[] {
  const scores = getGameScore(state);
  const highestScore = Math.max(...Object.values(scores));
  return state.players.filter((player) => scores[player.name] === highestScore);
}
