// src/lib/gamestore.ts
import type {
  GameState,
  Card,
  Player,
  Sheep,
  CardColor,
  CardType,
} from "./types";

class GameEngine {
  state = $state<GameState>({
    players: [],
    drawPile: [],
    discardPile: [],
    currentTurnPlayerId: "",
  });

  private createInitialDeck(): Card[] {
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
      { name: "Re-flip", count: 2 },
    ];
    const modifierConfig: { name: string; count: number }[] = [
      { name: "Paint", count: 2 },
      { name: "Franken", count: 2 },
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

    return deck;
  }

  // Fisher-Yates
  private shuffle(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  public InitGame(playerNames: string[]): void {
    const fullDeck = this.shuffle(this.createInitialDeck());

    this.state.players = playerNames.map((name, index) => {
      return {
        id: `player-${index + 1}`,
        name: name,
        hand: [],
        field: [],
      };
    });

    this.state.players.forEach((player) => {
      for (let i = 0; i < 5; i++) {
        const card = fullDeck.pop();
        if (card) {
          player.hand.push(card);
        }
      }
    });

    this.state.drawPile = fullDeck;

    const randomIndex = Math.floor(Math.random() * this.state.players.length);
    this.state.currentTurnPlayerId = this.state.players[randomIndex].id;
  }

  public isValidSheep(sheep: Sheep): boolean {
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
}

export const gameEngine = new GameEngine();
