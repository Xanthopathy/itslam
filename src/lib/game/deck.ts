// src/lib/game/deck.ts
import type { Card, CardColor } from "../types";

export function createInitialDeck(): Card[] {
  const deck: Card[] = [];
  const colors: CardColor[] = [
    "white",
    "orange",
    "magenta",
    "cyan",
    "beige",
    "yellow",
    "lime",
    "pink",
    "gray",
    "brown",
    "mint",
    "purple",
    "blue",
    "green",
    "red",
    "black",
    "rainbow",
    "rainbow",
  ]; // 16x regular, 2x rainbow
  const actionConfig: { name: string; count: number }[] = [
    { name: "Wheat", count: 3 },
    { name: "Wolf", count: 2 },
    { name: "Yoink", count: 2 },
    { name: "ReFlip", count: 2 },
  ];
  const modifierConfig: { name: string; count: number }[] = [
    { name: "Paint", count: 2 },
    { name: "Franken", count: 2 },
  ];
  const itslamConfig: { name: string }[] = [
    { name: "Remove 2 Sheep" },
    { name: "Yoink Entire Hand" },
    { name: "Lure 2 Sheep" },
    { name: "Halve 2 Sheep" },
    { name: "Recover 1 Sheep" },
  ];

  colors.forEach((color) => {
    deck.push({
      id: `head-${crypto.randomUUID()}`,
      name: `${color} Head`,
      type: "head",
      color: color,
    });
    deck.push({
      id: `butt-${crypto.randomUUID()}`,
      name: `${color} Butt`,
      type: "butt",
      color: color,
    });
  });

  actionConfig.forEach(({ name, count }) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `action-${crypto.randomUUID()}`,
        name: name,
        type: "action",
      });
    }
  });

  modifierConfig.forEach(({ name, count }) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `modifier-${crypto.randomUUID()}`,
        name: name,
        type: "modifier",
      });
    }
  });

  itslamConfig.forEach(({ name }) => {
    deck.push({
      id: `itslam-${crypto.randomUUID()}`,
      name: name,
      type: "itslam",
    });
  });

  return deck;
}

// Fisher-Yates
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
