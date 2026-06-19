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
    const chaosConfig: { name: string }[] = [
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

    chaosConfig.forEach(({ name }) => {
      deck.push({
        id: `chaos-${crypto.randomUUID()}`,
        name: name,
        type: "chaos",
      });
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

  /**
    * Check if a sheep is valid:
    - Must have exactly 2 parts (head + butt, or 2 heads/butts if Franken)
    - Both parts must be same color, or at least one is rainbow, or Franken modifier present
  */
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

  // ========== MODIFIER APPLICATION ==========
  /**
   * Check if modifier can be applied
   * - Modifiers resolve invalid sheep states
   * - Paint: allows mismatched colors
   * - Franken: allows mismatched parts (2 heads or 2 butts) (also allows mismatched colors)
   * - Only ONE modifier per sheep
   */
  public canApplyModifier(sheep: Sheep, modifier: Card): boolean {
    // TODO: Implement
    return true;
  }

  /**
   * Apply modifier to sheep object
   */
  public applyModifier(sheep: Sheep, modifier: Card): Sheep {
    // TODO: Implement
    return sheep;
  }

  // ========== FRANKEN SHEEP PROTECTIONS ==========
  /**
   * Check double-butt Franken protection vs Wheat action
   */
  private isProtectedFromWheat(sheep: Sheep): boolean {
    // TODO: Implement
    return false;
  }

  /**
   * Check double-head Franken protection vs Wolf action
   */
  private isProtectedFromWolf(sheep: Sheep): boolean {
    // TODO: Implement
    return false;
  }

  // ========== TURN MANAGEMENT ==========
  /**
   * Start turn: draw until hand >= 3 cards
   * Update currentTurnPlayerId
   */
  public startTurn(playerId: string): void {
    // TODO: Implement
  }

  /**
   * End turn: discard down to 7 cards (preserve Chaos cards)
   * Move to next player
   * Trigger final round if draw pile empty
   */
  public endTurn(playerId: string): void {
    // TODO: Implement
  }

  public getCurrentPlayer(): Player | undefined {
    // TODO: Implement
    return undefined;
  }

  public getNextPlayer(): Player | undefined {
    // TODO: Implement
    return undefined;
  }

  // ========== CARD DRAWING & PLAYING ==========
  /**
   * Draw card from draw pile
   * Auto-reshuffle discard pile if draw pile empty
   * Add to player hand
   * Return the card drawn
   */
  public drawCard(playerId: string): Card | undefined {
    // TODO: Implement
    return undefined;
  }

  /**
   * Play a card from hand based on type:
   * - head/butt: call playBodyCard()
   * - action: call playActionCard()
   * - modifier: validate & apply to target sheep
   * - chaos: call playChaosCard()
   * Return success/failure
   */
  public playCard(
    playerId: string,
    cardId: string,
    targetPlayerId?: string,
    targetSheepIndex?: number,
  ): boolean {
    // TODO: Implement
    return true;
  }

  /**
   * Play head or butt card:
   * - If targetSheepIndex: add to incomplete sheep (max 2 parts)
   * - Else: create new incomplete sheep in field
   */
  private playBodyCard(
    playerId: string,
    card: Card,
    targetSheepIndex?: number,
  ): void {
    // TODO: Implement
  }

  /**
   * Route action card to handler
   */
  private playActionCard(
    playerId: string,
    card: Card,
    targetPlayerId?: string,
    targetSheepIndex?: number,
  ): void {
    // TODO: Implement switch on card.name
  }

  // ========== ACTION CARD HANDLERS ==========
  /**
   * Yoink: Steal 2 random cards from opponent's hand
   */
  private handleYoink(playerId: string, targetPlayerId: string): void {
    // TODO: Implement
  }

  /**
   * Wheat: Steal 1 sheep from opponent's field
   * - Check isProtectedFromWheat
   * - Move to active player's field
   */
  private handleWheat(
    playerId: string,
    targetPlayerId: string,
    targetSheepIndex?: number,
  ): void {
    // TODO: Implement
  }

  /**
   * Wolf: Discard 1 sheep from opponent's field
   * - Check isProtectedFromWolf
   * - Send sheep parts + modifier to discard pile
   */
  private handleWolf(
    playerId: string,
    targetPlayerId: string,
    targetSheepIndex?: number,
  ): void {
    // TODO: Implement
  }

  /**
   * Re-flip: Allow re-rolling a Chaos coin flip
   * - Used in response to Chaos card flip result
   */
  private handleReFlip(
    playerId: string,
    targetPlayerId: string,
    targetSheepIndex?: number,
  ): void {
    // TODO: Implement
  }

  // ========== CHAOS CARD HANDLERS ==========
  /**
   * Play Chaos card with coin-flip mechanics:
   * 1. Get player's prediction (heads/tails)
   * 2. Flip coin (random boolean)
   * 3. Determine winner based on prediction vs result
   * 4. Route to appropriate handler based on card name
   */
  private playChaosCard(
    playerId: string,
    card: Card,
    targetPlayerId?: string,
  ): void {
    // TODO: Implement
  }

  /**
   * Lure 2 sheep: Move 2 sheep from opponent's field to beneficiary's field
   */
  private handleLure2Sheep(beneficiaryId: string, targetId: string): void {
    // TODO: Implement
  }

  /**
   * Remove 2 sheep: Send 2 sheep from target's field to discard pile
   * Discard parts + modifiers
   */
  private handleRemove2Sheep(targetId: string): void {
    // TODO: Implement
  }

  /**
   * Yoink entire hand: Transfer all cards from opponent's hand to beneficiary's hand
   */
  private handleYoinkEntireHand(beneficiaryId: string, targetId: string): void {
    // TODO: Implement
  }

  /**
   * Halve 2 sheep: Deconstruct 2 sheep from target's field
   * - Beneficiary takes 1 part + modifier from each
   * - Target gets remaining part back to hand
   */
  private handleHalve2Sheep(targetId: string): void {
    // TODO: Implement
  }

  /**
   * Recover 1 sheep: Find any valid sheep combination in discard pile
   * Play it to beneficiary's field
   * Remove from discard pile
   */
  private handleRecover1Sheep(playerId: string): void {
    // TODO: Implement
  }

  // ========== BODY SWAPPING ==========
  /**
   * Swap one part of a sheep with a card from hand:
   * - Find sheep at targetSheepIndex on targetPlayerId's field
   * - Replace sheep.parts[partIndex] with cardFromHand
   * - Validate resulting sheep is valid
   * - If valid && opponent's sheep: take replaced part + modifier to hand
   * - Return success/failure
   */
  public swapSheepPart(
    playerId: string,
    targetPlayerId: string,
    targetSheepIndex: number,
    partIndex: number,
    cardFromHandId: string,
  ): boolean {
    // TODO: Implement
    return false;
  }

  // ========== SCORING & GAME END ==========
  /**
   * Calculate sheep value:
   * - 0 if invalid
   * - 1 if standard valid sheep
   * - 2 if full rainbow sheep (both parts are rainbow)
   */
  private calculateSheepValue(sheep: Sheep): number {
    // TODO: Implement
    return 0;
  }

  /**
   * Get game score for all players:
   * - +1 per standard sheep on field
   * - +2 per full rainbow sheep on field
   * - -3 per Chaos card in hand
   * Return Record<playerName, score>
   */
  public getGameScore(): Record<string, number> {
    // TODO: Implement
    return {};
  }

  /**
   * Trigger final round when draw pile empties
   * Mark game state as in final round
   */
  private triggerFinalRound(): void {
    // TODO: Implement
  }

  /**
   * Check if game is over
   * - Final round active + all players have taken final turn
   */
  public isGameOver(): boolean {
    // TODO: Implement
    return false;
  }

  /**
   * Get winner(s) - player(s) with highest score
   */
  public getWinner(): Player[] {
    // TODO: Implement
    return [];
  }

  // ========== FIELD QUERIES ==========
  public getPlayerField(playerId: string): Sheep[] {
    // TODO: Implement
    return [];
  }

  public getPlayerHand(playerId: string): Card[] {
    // TODO: Implement
    return [];
  }

  public getRemainingDeckSize(): number {
    // TODO: Implement
    return 0;
  }

  public getDiscardPileSize(): number {
    // TODO: Implement
    return 0;
  }
}

export const gameEngine = new GameEngine();
