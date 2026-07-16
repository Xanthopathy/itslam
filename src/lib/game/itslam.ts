// src/lib/game/itslam.ts
import type { Card, CoinFlipState, GameState, Player, Sheep } from "../types";
import { describeSheep, isValidSheep } from "./sheep";
import {
  addCardToHand,
  addSheepToField,
  findPlayerById,
  log,
  removeSheepFromField,
  validateUniqueIndices,
} from "./utils";

// ========== INTERACTION FLOW ==========

/**
 * Play ITSLAM card with coin-flip mechanics:
 * 1. Get player's prediction (heads/tails)
 * 2. Flip coin (random boolean)
 * IMPORTANT: This should be done on the host and sent to all clients for validation
 * 3. Determine winner based on prediction vs result
 * 4. Route to appropriate handler based on card name
 *
 * Note: The card is removed from the player's hand when they play it, but the effect is not resolved until after the coin flip and winner determination. The card will be shown on the UI during this limbo, but it's effectively in the discard pile.
 */
export function playItslamCard(
  state: GameState,
  player: Player,
  card: Card,
  targetPlayer?: Player,
): boolean {
  if (state.activeCoinFlip) return false;
  if (player.itslamPlayedThisTurn) return false;
  if (targetPlayer && player.id === targetPlayer?.id) return false;
  if (card.name !== "Recover 1 Sheep" && !targetPlayer) return false;

  state.activeCoinFlip = {
    challengerId: player.id,
    defenderId: targetPlayer?.id,
    cardId: card.id,
    cardName: card.name ?? "",
    phase: "awaiting_prediction",
    reFlipCount: 0,
  };

  player.itslamPlayedThisTurn = true;
  return true;
}

/**
 * Re-flip: Allow re-rolling an ITSLAM coin flip (targets a coin flip, not a player)
 * - Used in response to ITSLAM card flip result
 * - ANYONE can play this in response to a coin flip, even if it's not their turn
 * - Flip result must have ~5 grace period to allow for re-flip to be played
 * - No limits on usage (we only have 2 though)
 */
export function playReFlipCard(state: GameState, playerId: string): boolean {
  const flip = state.activeCoinFlip;
  if (!flip || flip.phase !== "grace_period") return false;

  flip.prediction = undefined;
  flip.result = undefined;
  flip.winnerId = undefined;
  flip.graceWindowEndsAt = undefined;
  flip.reFlipCount += 1;
  flip.phase = "awaiting_prediction";

  log(
    state,
    `${findPlayerById(state, playerId)?.name ?? "A player"} played a Re-flip card! Restarting the prediction phase...`,
  );
  return true;
}

// ========== COIN FLIP PROGRESSION ==========

export function submitPrediction(
  state: GameState,
  playerId: string,
  prediction: "looking" | "not_looking",
): boolean {
  if (
    !state.activeCoinFlip ||
    state.activeCoinFlip.phase !== "awaiting_prediction"
  )
    return false;
  if (playerId !== state.activeCoinFlip.challengerId) return false;

  state.activeCoinFlip.prediction = prediction;
  state.activeCoinFlip.phase = "flipping";

  return true;
}

// This probably shouldn't even live as a method on GameEngine if you want to keep "pure deterministic replay" cleanly separated from "the one random roll." Worth considering: put generateFlipResult in the Svelte component / MQTT layer that's specifically marked as host-only logic, and keep GameEngine itself free of any Math.random() calls except inside createInitialDeck's shuffle (which already gets the same "host computes, broadcasts the result" treatment). That keeps the engine's public API surface = "things that get broadcast and replayed," and nothing inside it secretly rolls dice.
export function generateFlipResult(): "looking" | "not_looking" {
  return Math.random() < 0.5 ? "looking" : "not_looking";
}

/**
 * Host-only call: host generates the actual random result locally,
 * then broadcasts it via this method so every client (including host) applies the same value
 */
export function submitFlipResult(
  state: GameState,
  playerId: string,
  result: "looking" | "not_looking",
): boolean {
  if (playerId !== state.hostId) return false;

  const flip = state.activeCoinFlip;
  if (!flip || flip.phase !== "flipping") return false;

  flip.result = result;
  flip.graceWindowEndsAt = Date.now() + 5000; // 5 seconds grace period
  flip.phase = "grace_period";

  return true;
}

export function finalizeCoinFlip(state: GameState, playerId: string): void {
  if (playerId !== state.hostId) return;

  const flip = state.activeCoinFlip;
  if (!flip || flip.phase !== "grace_period") return;

  if (flip.graceWindowEndsAt === undefined) return;
  if (Date.now() < flip.graceWindowEndsAt) return;

  const winner = determineFlipWinner(flip);
  flip.winnerId = winner;
  flip.phase = "resolved";

  log(
    state,
    `Coin flip resolved: ${winner ? findPlayerById(state, winner)?.name : "No one"} won the flip (${flip.prediction} vs ${flip.result})`,
  );
}

export function determineFlipWinner(flip: CoinFlipState): string | undefined {
  const guessedCorrectly = flip.prediction === flip.result;

  return guessedCorrectly ? flip.challengerId : (flip.defenderId ?? undefined);
}

// ========== EFFECT RESOLUTION ENGINE ==========

export function resolveItslamEffect(
  state: GameState,
  playerId: string,
  sheepIndices?: number[],
  targetPartIndices?: number[],
  discardIndices?: number[],
): boolean {
  // validating the coin flip state and winner
  const flip = state.activeCoinFlip;
  if (!flip || flip.phase !== "resolved") return false;
  if (playerId !== flip.winnerId) return false;

  // validating the winner and loser players
  const winner = findPlayerById(state, flip.winnerId);
  const loserId = flip.defenderId
    ? flip.winnerId === flip.challengerId
      ? flip.defenderId
      : flip.challengerId
    : undefined;
  const loser = loserId ? findPlayerById(state, loserId) : undefined;
  if (!winner) return false;

  // what if lure/remove/halve were played against someone with nothing on the field? it could be a legit tactical play, so the game should still resolve
  // same deal in the case the player has nothing on their field and loses
  // therefore no minimum gating
  let success = false;
  switch (flip.cardName) {
    case "Lure 2 Sheep":
      if (
        !loser ||
        !sheepIndices ||
        sheepIndices.length > 2 ||
        !validateUniqueIndices(loser.field.length, sheepIndices)
      )
        return false;
      success = handleLure2Sheep(state, winner, loser, sheepIndices);
      break;
    case "Remove 2 Sheep":
      if (
        !loser ||
        !sheepIndices ||
        sheepIndices.length > 2 ||
        !validateUniqueIndices(loser.field.length, sheepIndices)
      )
        return false;
      success = handleRemove2Sheep(state, winner, loser, sheepIndices);
      break;
    case "Yoink Entire Hand":
      if (!loser) return false;
      success = handleYoinkEntireHand(state, winner, loser);
      break;
    case "Halve 2 Sheep":
      if (
        !loser ||
        !sheepIndices ||
        sheepIndices.length > 2 ||
        !targetPartIndices ||
        targetPartIndices.length !== sheepIndices.length ||
        !validateUniqueIndices(loser.field.length, sheepIndices)
      )
        return false;
      success = handleHalve2Sheep(
        state,
        winner,
        loser,
        sheepIndices,
        targetPartIndices,
      );
      break;
    case "Recover 1 Sheep":
      if (
        !discardIndices ||
        discardIndices.length === 0 ||
        discardIndices.length > 3
      )
        return false;
      success = handleRecover1Sheep(state, winner, discardIndices);
      break;
    default:
      return false;
  }

  if (!success) return false;

  state.activeCoinFlip = undefined;

  return true;
}

// ========== HANDLERS ==========

/**
 * Lure 2 sheep: Move 2 sheep from loser's field to winner's field
 */
export function handleLure2Sheep(
  state: GameState,
  winner: Player,
  loser: Player,
  sheepIndices: number[],
): boolean {
  const sheepToLure = [...sheepIndices]
    .sort((a, b) => b - a)
    .map((idx) => loser.field[idx]);

  for (const sheep of sheepToLure) {
    removeSheepFromField(loser, loser.field.indexOf(sheep));
    addSheepToField(winner, sheep);
  }

  log(
    state,
    `${winner.name} lured ${sheepToLure.length} sheep from ${loser.name}'s field`,
  );
  return true;
}

/**
 * Remove 2 sheep: Send 2 sheep from loser's field to discard pile
 * Discard parts + modifiers
 */
export function handleRemove2Sheep(
  state: GameState,
  winner: Player,
  loser: Player,
  sheepIndices: number[],
): boolean {
  const sheepToRemove = [...sheepIndices]
    .sort((a, b) => b - a) // remove from highest index to lowest to avoid index shifting
    .map((idx) => loser.field[idx]);

  for (const sheep of sheepToRemove) {
    removeSheepFromField(loser, loser.field.indexOf(sheep));
    state.discardPile.push(
      ...(sheep.modifier ? [...sheep.parts, sheep.modifier] : sheep.parts),
    );
  }

  log(
    state,
    `${winner.name} removed ${sheepToRemove.length} sheep from ${loser.name}'s field`,
  );
  return true;
}

/**
 * Yoink entire hand: Transfer all cards from loser's hand to winner's hand
 * Retains order of cards in both hands (oldest winner -> newest winner -> oldest loser -> newest loser)
 */
export function handleYoinkEntireHand(
  state: GameState,
  winner: Player,
  loser: Player,
): boolean {
  const stolen = loser.hand.splice(0, loser.hand.length);
  stolen.forEach((card) => addCardToHand(winner, card));

  log(state, `${winner.name} yoinked ${loser.name}'s entire hand`);
  return true;
}

/**
 * Halve 2 sheep: Deconstruct 2 sheep (max) from loser's field
 * - Winner takes 1 part + any modifier from each sheep
 * - Loser (automatically) gets remaining part back to hand from each sheep
 */
export function handleHalve2Sheep(
  state: GameState,
  winner: Player,
  loser: Player,
  sheepIndices: number[],
  targetPartIndices: number[],
): boolean {
  // validate targetPartIndices: must be 0 or 1
  for (const idx of targetPartIndices) {
    if (idx < 0 || idx > 1) return false;
  }

  // pair sheepIndices with targetPartIndices
  // sort by sheep index descending to avoid index shifting when removing from loser's field
  const pairsOfSheepAndPartsToHalve = sheepIndices
    .map((idx, i) => ({
      sheepIndex: idx,
      partIndex: targetPartIndices[i],
    }))
    .sort((a, b) => b.sheepIndex - a.sheepIndex);

  for (const { sheepIndex, partIndex } of pairsOfSheepAndPartsToHalve) {
    const sheep = loser.field[sheepIndex];

    // Give the chosen part to the winner (+ any modifier)
    addCardToHand(winner, sheep.parts[partIndex]);
    if (sheep.modifier) {
      addCardToHand(winner, sheep.modifier);
      sheep.modifier = undefined;
    }

    // Return the remaining part to the loser's hand
    const remainingPartIndex = partIndex === 0 ? 1 : 0;
    addCardToHand(loser, sheep.parts[remainingPartIndex]);
    removeSheepFromField(loser, sheepIndex);
  }

  log(
    state,
    `${winner.name} halved ${pairsOfSheepAndPartsToHalve.length} sheep from ${loser.name}'s field`,
  );
  return true;
}

/**
 * Recover 1 sheep: Find any valid sheep combination in discard pile
 * Play it to winner's field
 * Remove from discard pile
 */
export function handleRecover1Sheep(
  state: GameState,
  winner: Player,
  discardIndices: number[],
): boolean {
  if (!validateUniqueIndices(state.discardPile.length, discardIndices))
    return false;

  // discardIndices only points to 2-3 cards in the discard pile, need to search for which one is a part and which one is a modifier (if any)
  const parts = discardIndices
    .map((idx) => state.discardPile[idx])
    .filter((card) => card.type === "head" || card.type === "butt");
  if (parts.length < 2) return false;

  let modifier = undefined; // optional, will be set if found
  if (discardIndices.length === 3) {
    modifier = discardIndices
      .map((idx) => state.discardPile[idx])
      .find((card) => card.type === "modifier");
    if (!modifier) return false;
  }

  const candidate: Sheep = {
    parts: parts as [Card, Card],
    modifier: modifier,
  };
  if (!isValidSheep(candidate)) return false;

  addSheepToField(winner, candidate);

  // Remove the used cards from the discard pile (in reverse order to avoid index shifting)
  for (const idx of [...discardIndices].sort((a, b) => b - a)) {
    state.discardPile.splice(idx, 1);
  }

  log(
    state,
    `${winner.name} recovered a ${describeSheep(candidate)} from the discard pile`,
  );
  return true;
}
