// src/lib/game/action.ts
import type { Card, GameState, Player, Sheep } from "../types";
import {
  addCardToHand,
  addSheepToField,
  log,
  removeCardFromHand,
  removeSheepFromField,
  validateUniqueIndices,
} from "./utils";
import { describeSheep } from "./sheep";

/**
 * Check double-butt Franken protection vs Wheat action
 */
export function isFieldProtectedFromWheat(field: Sheep[]): boolean {
  return field.some(
    (sheep) =>
      sheep.modifier?.name === "Franken" &&
      sheep.parts.every((p) => p.type === "butt"),
  );
}

/**
 * Check double-head Franken protection vs Wolf action
 */
export function isFieldProtectedFromWolf(field: Sheep[]): boolean {
  return field.some(
    (sheep) =>
      sheep.modifier?.name === "Franken" &&
      sheep.parts.every((p) => p.type === "head"),
  );
}

/**
 * Route action card to handler
 */
export function playActionCard(
  state: GameState,
  player: Player,
  card: Card,
  targetPlayer: Player,
  targetSheepIndex?: number,
  chosenIndices?: number[],
): boolean {
  if (player.id === targetPlayer.id) return false;

  let success = false;
  switch (card.name) {
    case "Yoink":
      if (!chosenIndices) return false;
      success = handleYoink(state, player, targetPlayer, chosenIndices);
      break;
    case "Wheat":
      if (targetSheepIndex === undefined) return false;
      success = handleWheat(state, player, targetPlayer, targetSheepIndex);
      break;
    case "Wolf":
      if (targetSheepIndex === undefined) return false;
      success = handleWolf(state, player, targetPlayer, targetSheepIndex);
      break;
  }

  return success;
}

/**
 * Yoink: Steal 2 cards face-down from opponent's hand
 *
 * You get to see the target's hand face down to pick from, where there's a clear order (oldest left -> newest right) for how long the card has been in their hand
 *
 * Automatically steal all if target has 1 or 2 cards, still counts as success if hand has 0 cards
 *
 * !HAND MANIPULATION MUST RESPECT CARD ORDER FOR THIS TO WORK, DO NOT SHUFFLE/RANDOMIZE ANY HAND MANIPULATION
 */
export function handleYoink(
  state: GameState,
  player: Player,
  targetPlayer: Player,
  chosenIndices: number[],
): boolean {
  const expectedCount = Math.min(2, targetPlayer.hand.length);
  if (chosenIndices.length !== expectedCount) return false;

  if (!validateUniqueIndices(targetPlayer.hand.length, chosenIndices))
    return false;

  // Snapshot cards in oldest -> newest order before removing anything.
  const cardsToSteal = [...chosenIndices]
    .sort((a, b) => a - b)
    .map((idx) => targetPlayer.hand[idx]);

  for (const card of cardsToSteal) {
    removeCardFromHand(targetPlayer, card);
    addCardToHand(player, card);
  }

  const cardAmt = expectedCount === 1 ? "card" : "cards";
  log(
    state,
    `${player.name} yoinked ${expectedCount} ${cardAmt} from ${targetPlayer.name}'s hand`,
  );
  return true;
}

/**
 * Wheat: Steal 1 sheep from opponent's field
 * - Check isProtectedFromWheat
 * - Move to active player's field
 */
export function handleWheat(
  state: GameState,
  player: Player,
  targetPlayer: Player,
  targetSheepIndex: number,
): boolean {
  if (isFieldProtectedFromWheat(targetPlayer.field)) return false;
  const sheep = removeSheepFromField(targetPlayer, targetSheepIndex);
  if (!sheep) return false;

  addSheepToField(player, sheep);

  log(
    state,
    `${player.name} lured ${describeSheep(sheep)} from ${targetPlayer.name}'s field with Wheat`,
  );
  return true;
}

/**
 * Wolf: Discard 1 sheep from opponent's field
 * - Check isProtectedFromWolf
 * - Send sheep parts + modifier to discard pile
 */
export function handleWolf(
  state: GameState,
  player: Player,
  targetPlayer: Player,
  targetSheepIndex: number,
): boolean {
  if (isFieldProtectedFromWolf(targetPlayer.field)) return false;
  const sheep = removeSheepFromField(targetPlayer, targetSheepIndex);
  if (!sheep) return false;

  state.discardPile.push(
    ...(sheep.modifier ? [sheep.modifier] : []),
    ...sheep.parts,
  );

  log(
    state,
    `${targetPlayer.name}'s ${describeSheep(sheep)} was eaten by ${player.name}'s Wolf`,
  );
  return true;
}
