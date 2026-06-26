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

export type CardType = "head" | "butt" | "action" | "modifier" | "itslam";

// Action: "Wheat", "Wolf", "Yoink", "ReFlip"
// Modifier: "Paint", "Franken". Note that Franken implictly has Paint too, so you can stitch completely different parts AND colors together like [White Head, Black Head].
// Is That Sheep Looking At Me / ITSLAM / Chaos: "Remove 2 Sheep", "Yoink Entire Hand", "Lure 2 Sheep", "Halve 2 Sheep", "Recover 1 Sheep"
// Head/Butt: "White Sheep", "Orange Butt". Concat from color and type.
export type Card = {
  id: string;
  name: string;
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
  itslamPlayedThisTurn: boolean;
};

export type GameStatus = "lobby" | "playing" | "finished";

// 1. Player plays an ITSLAM card, then picks an opponent
// 2. Player makes a prediction (looking / not looking)
// 3. Coin flips (host-generated)
// 4. Grace period - anyone can play Re-flip during this window
// 5. If Re-flip is played: re-flip, restart from step 2 (player has to make a new prediction)
// 6. Winner determined (prediction vs result)
// 7. Effect resolves based on which of the 5 ITSLAM cards it was, and who won
export type ItslamPhase =
  | "awaiting_prediction" // step 2: card+opponent picked, waiting on prediction
  | "flipping" // step 3: host is generating the result (brief, may not even need to be observable)
  | "grace_period" // step 4: result is in, Re-flip window open
  | "resolved"; // step 6-7: winner determined, effect applied, ready to clear

// Coin has sheep head and butt
export type CoinFlipState = {
  challengerId: string;
  defenderId: string;
  cardId: string;
  cardName: string;
  phase: ItslamPhase;
  prediction?: "looking" | "not_looking"; // cleared on re-flip, set at step 2
  result?: "looking" | "not_looking"; // set at step 3, cleared on re-flip
  winnerId?: string; // set at step 6
  graceWindowEndsAt?: number; // timestamp, set at step 3/4, used by step 4's window
  reFlipCount: number; // increments each time step 5 triggers, replaces reFlipUsed
};

export type GameState = {
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  currentTurnPlayerId: string;
  status: GameStatus;
  roomCode?: string;
  gameLog: GameLogEntry[];
  activeCoinFlip?: CoinFlipState;
  isFinalRound: boolean;
  finalRoundTriggeredBy?: string;
};

export type GameLogEntry = {
  id: string;
  timestamp: number;
  message: string;
};
