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

    // 3x wheat, 2x wolf, 2x yoink, 2x re-flip
    actionConfig.forEach(({ name, count }) => {
      for (let i = 0; i < count; i++) {
        deck.push({
          id: `action-${crypto.randomUUID()}`,
          name: name,
          type: "action",
        });
      }
    });

    // 2x paint, 2x franken
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
}

export const gameEngine = new GameEngine();
