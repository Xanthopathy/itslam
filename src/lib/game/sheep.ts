// src/lib/game/sheep.ts
import type { Card, GameState, Player, Sheep } from "../types";
import { addCardToHand, addSheepToField, log } from "./utils";

// ========== CORE ACTIONS ==========

/**
 * Form a sheep from 2 parts and optional modifier
 */
export function formSheep(
  state: GameState,
  player: Player,
  parts: [Card, Card],
  modifier?: Card,
): boolean {
  const candidate: Sheep = { parts };

  if (!modifier) {
    if (!isValidSheep(candidate)) return false;
    addSheepToField(player, candidate);

    log(state, `${player.name} formed a ${describeSheep(candidate)}.`);
    return true;
  }

  if (!canApplyModifier(candidate, modifier)) return false;
  candidate.modifier = modifier;
  addSheepToField(player, candidate);

  log(state, `${player.name} formed a ${describeSheep(candidate)}.`);
  return true;
}

/**
 * Swap one part of a sheep on any player's field with a card already
 * resolved by the caller (does NOT remove cardFromHand from player's hand —
 * playCards handles that).
 * On success: any part/modifier bumped off the sheep goes directly into
 * player's hand (the active player performing the swap), regardless of
 * whose field was modified.
 * Return success/failure
 */
export function swapSheepPart(
  state: GameState,
  player: Player,
  targetPlayer: Player,
  targetSheepIndex: number,
  targetPartIndex: number,
  partFromHand: Card,
): boolean {
  const targetSheep = targetPlayer.field[targetSheepIndex];
  if (!targetSheep) return false;
  if (targetPartIndex < 0 || targetPartIndex > 1) return false;

  const newParts = [...targetSheep.parts] as [Card, Card];
  const oldPart = newParts[targetPartIndex];
  newParts[targetPartIndex] = partFromHand;

  const candidate: Sheep = {
    parts: newParts,
    modifier: targetSheep.modifier,
  };
  if (!isValidSheep(candidate)) return false;

  const oldModifier = targetSheep.modifier;
  const modifierNowRedundant =
    oldModifier && !canApplyModifier(candidate, oldModifier);

  targetSheep.parts = newParts;
  addCardToHand(player, oldPart);

  if (modifierNowRedundant) {
    targetSheep.modifier = undefined;
    addCardToHand(player, oldModifier);
  }

  const fieldOwner =
    targetPlayer.id === player.id ? "their own" : `${targetPlayer.name}'s`;
  log(
    state,
    `${player.name} swapped a ${oldPart.color} ${oldPart.type} on ${fieldOwner} field`,
  );
  return true;
}

// ========== VALIDATION & UTILITY ==========

/**
 * Check if a sheep is valid:
 * - Must have exactly 2 parts (head + butt, or 2 heads/butts if Franken)
 * - Both parts must be same color, or at least one is rainbow, or Franken modifier present
 */
export function isValidSheep(sheep: Sheep): boolean {
  if (sheep.parts.length !== 2) return false;
  const [part1, part2] = sheep.parts;

  const hasPaint = sheep.modifier?.name === "Paint";
  const hasFranken = sheep.modifier?.name === "Franken";
  const isCorrectStructure = part1.type !== part2.type; // one head and one butt
  const isCorrectColor =
    part1.color === part2.color ||
    part1.color === "rainbow" ||
    part2.color === "rainbow";

  const structureIsValid = isCorrectStructure || hasFranken;
  if (!structureIsValid) return false;

  const colorIsValid = isCorrectColor || hasPaint || hasFranken;
  if (!colorIsValid) return false;

  return true;
}

/**
 * Check if modifier can be applied
 * - Modifiers resolve invalid sheep states
 * - Paint: allows mismatched colors
 * - Franken: allows mismatched parts (2 heads or 2 butts) (also allows mismatched colors)
 * - Only ONE modifier per sheep
 */
export function canApplyModifier(sheep: Sheep, modifier: Card): boolean {
  if (sheep.modifier || isValidSheep(sheep)) return false;

  const [part1, part2] = sheep.parts;
  if (
    modifier.name === "Paint" &&
    part1.color !== part2.color &&
    part1.type !== part2.type
  )
    return true;
  else if (modifier.name === "Franken" && part1.type === part2.type)
    return true;

  return false;
}

export function describeSheep(sheep: Sheep): string {
  const [part1, part2] = sheep.parts;
  if (part1.color === part2.color && part1.color === "rainbow")
    return "Full Rainbow Sheep";
  else if (sheep.modifier?.name === "Franken") {
    if (part1.color !== part2.color)
      return `Franken Sheep (${part1.color} ${part1.type} + ${part2.color} ${part2.type})`;
    else return `Franken Sheep (2 ${part1.type}s)`;
  } else if (sheep.modifier?.name === "Paint")
    return `Painted Sheep (${part1.color} + ${part2.color})`;
  return `${sheep.parts[0].color} Sheep`;
}

/**
 * Calculate sheep value:
 * - 0 if invalid
 * - 1 if standard valid sheep
 * - 2 if full rainbow sheep (both parts are rainbow)
 */
export function calculateSheepValue(sheep: Sheep): number {
  if (!isValidSheep(sheep)) return 0;
  const isFullRainbow = sheep.parts.every((p) => p.color === "rainbow");
  return isFullRainbow ? 2 : 1;
}
