// src/lib/gamestore.ts
import type {
  GameState,
  Card,
  Player,
  Sheep,
  CardColor,
  CardType,
} from "./types";

// TODO: Split into multiple files for better organization
class GameEngine {
  state = $state<GameState>({
    players: [],
    drawPile: [],
    discardPile: [],
    currentTurnPlayerId: "",
    status: "lobby",
    gameLog: [],
    isFinalRound: false,
  });

  // ========= DECK CREATION & SHUFFLING ==========
  // IMPORTANT: Because we're using MQTT, the host will be the one to run InitGame() and then send the full deck to all clients. This ensures that all clients have the same deck order and can validate game state independently.
  // The host will broadcast every other RNG event as well.
  // Make sure to freeze the game if the host disconnects
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
        itslamPlayedThisTurn: false,
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
    if (sheep.modifier || this.isValidSheep(sheep)) return false;

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

  /**
   * Apply modifier to sheep object
   */
  public applyModifier(sheep: Sheep, modifier: Card): void {
    sheep.modifier = modifier;
  }

  // ========== FRANKEN SHEEP PROTECTIONS ==========
  /**
   * Check double-butt Franken protection vs Wheat action
   */
  private isProtectedFromWheat(sheep: Sheep): boolean {
    const [part1, part2] = sheep.parts;
    if (
      sheep.modifier?.name === "Franken" &&
      sheep.parts.every((p) => p.type === "butt")
    )
      return true;
    return false;
  }

  /**
   * Check double-head Franken protection vs Wolf action
   */
  private isProtectedFromWolf(sheep: Sheep): boolean {
    const [part1, part2] = sheep.parts;
    if (
      sheep.modifier?.name === "Franken" &&
      sheep.parts.every((p) => p.type === "head")
    )
      return true;
    return false;
  }

  // ========== TURN MANAGEMENT ==========
  /**
   * Start turn: draw until hand >= 3 cards
   * Update currentTurnPlayerId
   */
  public startTurn(playerId: string): void {
    const player = this.findPlayerById(playerId);
    if (!player) return;

    player.itslamPlayedThisTurn = false;

    this.drawCard(playerId);
    while (player.hand.length < 3 && this.state.drawPile.length > 0) {
      this.drawCard(playerId);
    }
  }

  /**
   * End turn: discard down to 7 cards (preserve itslam cards)
   * Move to next player
   * Trigger final round if draw pile empty
   */
  public endTurn(playerId: string, cardIdsToDiscard: string[]): void {
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
   * Add to player hand
   * Trigger final round if draw pile empties
   */
  public drawCard(playerId: string): void {
    const player = this.findPlayerById(playerId);
    if (!player) return;

    if (this.state.drawPile.length === 0) return;
    player.hand.push(this.state.drawPile.pop() as Card);
    if (this.state.drawPile.length === 0) {
      this.triggerFinalRound();
    }
  }

  /**
   * Discard a card from player's hand
   * Add to discard pile
   */
  public discardCard(playerId: string, cardId: string): void {
    const player = this.findPlayerById(playerId);
    if (!player) return;

    const discardedCard = this.removeCardFromHand(player, cardId);
    if (!discardedCard) return;

    this.state.discardPile.push(discardedCard);
  }

  /**
   * Play a card from hand based on type:
   * - head/butt: call playBodyCard()
   * - action: call playActionCard()
   * - modifier: validate & apply to target sheep
   * - itslam: call playItslamCard()
   * Handles removal
   * Return success/failure
   * Multicard (2 or 3):
   * - Forming a sheep on your board (with 2 parts and an optional modifier)
   * - Modifying an existing sheep on ANY board (if you're also bringing a modifier in addition to swapping 1 part of the sheep)
   * Singlecard:
   * - Modifying an existing sheep on ANY board (if you're only swapping 1 part of the sheep)
   * - Actions
   * - ITSLAM
   */
  public playCards(
    playerId: string,
    cardIds: string[],
    targetPlayerId?: string,
    targetSheepIndex?: number,
    targetPartIndex?: number,
  ): boolean {
    const player = this.findPlayerById(playerId);
    if (!player) return false;

    // fetch all cards from cardIds
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const cardIndex = this.findCardInHand(player, cardId);
      if (cardIndex === undefined) return false;
      cards.push(player.hand[cardIndex]);
    }

    const targetPlayer = targetPlayerId
      ? this.findPlayerById(targetPlayerId)
      : undefined;
    if (targetPlayerId && !targetPlayer) return false;

    let success = false;
    switch (cardIds.length) {
      // action, itslam, single-part-swap (playing modifier alone is illegal)
      case 1: {
        const card = cards[0];
        if (card.type === "action") {
          success = this.playActionCard(player, card, targetPlayerId);
          break;
        } else if (card.type === "itslam") {
          success = this.playItslamCard(player, card, targetPlayerId);
          break;
        } else if (card.type === "head" || card.type === "butt") {
          if (
            !targetPlayer ||
            targetSheepIndex === undefined ||
            targetPartIndex === undefined
          )
            return false;
          success = this.swapSheepPart(
            player,
            targetPlayer,
            targetSheepIndex,
            targetPartIndex,
            card,
          );
          break;
        } else {
          success = false;
          break;
        }
      }
      // 2 parts, 2 parts + modifier, 1 part + modifier (swap)
      case 2: {
        const parts = cards.filter(
          (c: Card) => c.type === "head" || c.type === "butt",
        );
        if (parts.length === 2) {
          success = this.formSheep(player, [parts[0], parts[1]]);
          break;
        } else {
          success = false;
          break;
        }
      }
      // 2 parts + modifier
      case 3: {
      }
      default:
        success = false;
    }

    if (!success) return false;
    for (const id of cardIds) this.removeCardFromHand(player, id);

    return true;
  }

  /**
   * Form a sheep from 2 parts and optional modifier
   */
  private formSheep(
    player: Player,
    parts: [Card, Card],
    modifier?: Card,
  ): boolean {
    const candidate: Sheep = { parts };

    if (!modifier) {
      if (!this.isValidSheep(candidate)) return false;
      player.field.push(candidate);
      return true;
    }

    if (!this.canApplyModifier(candidate, modifier)) return false;
    this.applyModifier(candidate, modifier);
    player.field.push(candidate);

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
  private swapSheepPart(
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
    if (!this.isValidSheep(candidate)) return false;

    const oldModifier = targetSheep.modifier;
    const modifierNowRedundant =
      oldModifier && !this.canApplyModifier(candidate, oldModifier);

    targetSheep.parts = newParts;
    player.hand.push(oldPart);

    if (modifierNowRedundant) {
      targetSheep.modifier = undefined;
      player.hand.push(oldModifier);
    }

    return true;
  }

  /**
   * Route action card to handler
   */
  private playActionCard(
    player: Player,
    card: Card,
    targetPlayerId?: string,
    targetSheepIndex?: number,
  ): boolean {
    // TODO: Implement switch on card.name
    return false;
  }

  // ========== ACTION CARD HANDLERS ==========
  /**
   * Yoink: Steal 2 random cards from opponent's hand
   */
  private handleYoink(player: Player, targetPlayerId: string): void {
    // TODO: Implement
  }

  /**
   * Wheat: Steal 1 sheep from opponent's field
   * - Check isProtectedFromWheat
   * - Move to active player's field
   */
  private handleWheat(
    player: Player,
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
   * Re-flip: Allow re-rolling an ITSLAM coin flip
   * - Used in response to ITSLAM card flip result
   */
  private handleReFlip(
    playerId: string,
    targetPlayerId: string,
    targetSheepIndex?: number,
  ): void {
    // TODO: Implement
  }

  // ========== ITSLAM CARD HANDLERS ==========

  /**
   * Play ITSLAM card with coin-flip mechanics:
   * 1. Get player's prediction (heads/tails)
   * 2. Flip coin (random boolean)
   * IMPORTANT: This should be done on the host and sent to all clients for validation
   * 3. Determine winner based on prediction vs result
   * 4. Route to appropriate handler based on card name
   */
  private playItslamCard(
    player: Player,
    card: Card,
    targetPlayerId?: string,
  ): boolean {
    // TODO: Implement
    return false;
  }

  /**
   * Lure 2 sheep: Move 2 sheep from opponent's field to beneficiary's field
   */
  private handleLure2Sheep(beneficiary: Player, target: Player): void {
    // TODO: Implement
  }

  /**
   * Remove 2 sheep: Send 2 sheep from target's field to discard pile
   * Discard parts + modifiers
   */
  private handleRemove2Sheep(target: Player): void {
    // TODO: Implement
  }

  /**
   * Yoink entire hand: Transfer all cards from opponent's hand to beneficiary's hand
   */
  private handleYoinkEntireHand(beneficiary: Player, target: Player): void {
    // TODO: Implement
  }

  /**
   * Halve 2 sheep: Deconstruct 2 sheep from target's field
   * - Beneficiary takes 1 part + modifier from each
   * - Target gets remaining part back to hand
   */
  private handleHalve2Sheep(target: Player): void {
    // TODO: Implement
  }

  /**
   * Recover 1 sheep: Find any valid sheep combination in discard pile
   * Play it to beneficiary's field
   * Remove from discard pile
   */
  private handleRecover1Sheep(player: Player): void {
    // TODO: Implement
  }

  // ========== SCORING & GAME END ==========
  /**
   * Calculate sheep value:
   * - 0 if invalid
   * - 1 if standard valid sheep
   * - 2 if full rainbow sheep (both parts are rainbow)
   */
  private calculateSheepValue(sheep: Sheep): number {
    if (!this.isValidSheep(sheep)) return 0;
    const isFullRainbow = sheep.parts.every((p) => p.color === "rainbow");
    return isFullRainbow ? 2 : 1;
  }

  /**
   * Get game score for all players:
   * - +1 per standard sheep on field
   * - +2 per full rainbow sheep on field
   * - -3 per ITSLAM card in hand
   * Return Record<playerName, score>
   */
  public getGameScore(): Record<string, number> {
    const score: Record<string, number> = {};
    this.state.players.forEach((player) => {
      const sheepScore = player.field.reduce(
        (accumulator, sheep) => accumulator + this.calculateSheepValue(sheep),
        0,
      );
      const itslamPenalty =
        player.hand.filter((card) => card.type === "itslam").length * 3;
      score[player.name] = sheepScore - itslamPenalty;
    });
    return score;
  }

  /**
   * Trigger final round when draw pile empties
   * Mark game state as in final round
   * The final round starts with the player who emptied the draw pile
   * Marks the game as the final round, where everyone gets to play their last turn starting from the emptier.
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
    const player = this.findPlayerById(playerId);
    if (!player) return [];
    return player.field;
  }

  public getPlayerHand(playerId: string): Card[] {
    const player = this.findPlayerById(playerId);
    if (!player) return [];
    return player.hand;
  }

  public getRemainingDeckSize(): number {
    return this.state.drawPile.length;
  }

  public getDiscardPileSize(): number {
    return this.state.discardPile.length;
  }

  // ========== HELPER FUNCTIONS ==========
  private findPlayerById(playerId: string): Player | undefined {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) {
      console.error(`Player ${playerId} not found.`);
      return undefined;
    }
    return player;
  }

  private findCardInHand(player: Player, cardId: string): number | undefined {
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      console.error(`Card ${cardId} not found in player ${player.id}'s hand.`);
      return undefined;
    }
    return cardIndex;
  }

  private removeCardFromHand(player: Player, cardId: string): Card | undefined {
    const cardIndex = this.findCardInHand(player, cardId);
    if (cardIndex === undefined) return undefined;
    return player.hand.splice(cardIndex, 1)[0];
  }
}

export const gameEngine = new GameEngine();
