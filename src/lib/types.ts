// src/lib/types.ts
export type CardColor =
  | "white"
  | "orange"
  | "magenta"
  | "cyan"
  | "beige"
  | "yellow"
  | "lime"
  | "pink"
  | "gray"
  | "brown"
  | "mint"
  | "purple"
  | "blue"
  | "green"
  | "red"
  | "black"
  | "rainbow";

export type CardType = "head" | "butt" | "action" | "modifier" | "chaos";

export type Card = {
  id: string;
  name: string;
  // Action: "Wheat", "Wolf", "Yoink", "Re-Flip"
  // Modifier: "Paint", "Franken". Note that Franken implictly has Paint too, so you can stitch completely different parts AND colors together like [White Head, Black Head].
  // Is That Sheep Looking At Me / Chaos: "Remove 2 Sheep", "Yoink Entire Hand", "Lure 2 Sheep", "Halve 2 Sheep", "Recover 1 Sheep"
  // Head/Butt: "White Sheep", "Orange Butt". Concat from color and type.
  type: CardType;
  color?: CardColor; // optional, only for sheeps
};

export type Sheep = {
  parts: Card[]; // [head, butt] default, [head, head] and [butt, butt] only if modifier.type === "Franken"
  modifier?: Card; // optional and singular
};

export type Player = {
  id: string;
  name: string;
  hand: Card[];
  field: Sheep[];
};

export type GameState = {
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  currentTurnPlayerId: string;
};
