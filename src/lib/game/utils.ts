// src/lib/game/utils.ts
import type { Card, GameState, Player, Sheep } from "$lib/types";

// ========== MISC / SHARED ==========

export function log(state: GameState, message: string): void {
  state.gameLog.push({
    id: crypto.randomUUID(),
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Generic bounds + uniqueness check for a set of array indices.
 * Used anywhere a caller selects several distinct slots by index —
 * a field, a hand, or the discard pile.
 */
export function validateUniqueIndices(
  length: number,
  indices: number[],
): boolean {
  if (indices.length === 0) return false;
  const uniqueIndices = new Set(indices);
  if (uniqueIndices.size !== indices.length) return false;
  for (const idx of indices) {
    if (idx < 0 || idx >= length) return false;
  }
  return true;
}

// ========== PLAYER-RELATED ==========

export function findPlayerById(
  state: GameState,
  playerId: string,
): Player | undefined {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    console.error(`Player ${playerId} not found.`);
    return undefined;
  }
  return player;
}

// ========== HAND-RELATED ==========

export function findCardIndexById(
  player: Player,
  cardId: string,
): number | undefined {
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    console.error(`Card ${cardId} not found in player ${player.id}'s hand.`);
    return undefined;
  }
  return cardIndex;
}

export function addCardToHand(player: Player, card: Card): void {
  player.hand.push(card);
}

/**
 * Preserves order of cards in hand when removing a card.
 * Returns the removed card or undefined if not found.
 */
export function removeCardFromHand(
  player: Player,
  card: Card,
): Card | undefined {
  const cardIndex = findCardIndexById(player, card.id);
  if (cardIndex === undefined) return undefined;
  return player.hand.splice(cardIndex, 1)[0];
}

/**
 * Discard a card from player's hand
 * Add to discard pile
 */
export function discardCard(
  state: GameState,
  player: Player,
  card: Card,
): void {
  const discardedCard = removeCardFromHand(player, card);
  if (!discardedCard) return;

  state.discardPile.push(discardedCard);
}

// ========== FIELD-RELATED ==========

export function addSheepToField(player: Player, sheep: Sheep): void {
  player.field.push(sheep);
}

export function removeSheepFromField(
  player: Player,
  sheepIndex: number,
): Sheep | undefined {
  const sheep = player.field[sheepIndex];
  if (!sheep) {
    console.error(
      `Sheep at index ${sheepIndex} not found on player ${player.id}'s field.`,
    );
    return undefined;
  }
  return player.field.splice(sheepIndex, 1)[0];
}
