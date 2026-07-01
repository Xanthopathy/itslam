// src/lib/gamestore.ts
import type {
  CardColor,
  CardType,
  Card,
  Sheep,
  Player,
  GameStatus,
  ItslamPhase,
  CoinFlipState,
  GameState,
  GameLogEntry,
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
    finalRoundTriggeredBy: undefined,
    hostId: undefined,
  });

  // ========= DECK CREATION & SHUFFLING ==========
  // IMPORTANT: Because we're using MQTT, the host will be the one to run InitGame() and then send the full deck to all clients. This ensures that all clients have the same deck order and can validate game state independently.
  // The host will broadcast every other RNG event as well.
  // TODO: Make sure to freeze the game if the host disconnects
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
  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  public InitGame(playerNames: string[]): void {
    if (this.state.status === "playing") return;

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
    this.state.hostId = this.state.players[0].id; // First player in the lobby is the host as they created the lobby/game

    this.state.players.forEach((player) => {
      for (let i = 0; i < 5; i++) {
        const card = fullDeck.pop();
        if (card) {
          this.addCardToHand(player, card);
        }
      }
    });

    this.state.drawPile = fullDeck;

    // Shuffle player-order, then select starting index
    this.state.players = this.shuffle(this.state.players);
    const randomIndex = Math.floor(Math.random() * this.state.players.length);
    this.state.currentTurnPlayerId = this.state.players[randomIndex].id;

    const firstPlayer = this.findPlayerById(this.state.currentTurnPlayerId);
    if (!firstPlayer) return;

    this.state.status = "playing";
    this.log(`Game started! ${firstPlayer.name} goes first`);
    this.startTurn(firstPlayer);
  }

  /**
    * Check if a sheep is valid:
    - Must have exactly 2 parts (head + butt, or 2 heads/butts if Franken)
    - Both parts must be same color, or at least one is rainbow, or Franken modifier present
  */
  private isValidSheep(sheep: Sheep): boolean {
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
  private canApplyModifier(sheep: Sheep, modifier: Card): boolean {
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
  private applyModifier(sheep: Sheep, modifier: Card): void {
    sheep.modifier = modifier;
  }

  // ========== FRANKEN SHEEP PROTECTIONS ==========
  /**
   * Check double-butt Franken protection vs Wheat action
   */
  private isFieldProtectedFromWheat(field: Sheep[]): boolean {
    return field.some(
      (sheep) =>
        sheep.modifier?.name === "Franken" &&
        sheep.parts.every((p) => p.type === "butt"),
    );
  }

  /**
   * Check double-head Franken protection vs Wolf action
   */
  private isFieldProtectedFromWolf(field: Sheep[]): boolean {
    return field.some(
      (sheep) =>
        sheep.modifier?.name === "Franken" &&
        sheep.parts.every((p) => p.type === "head"),
    );
  }

  // ========== TURN MANAGEMENT ==========
  /**
   * Start turn: draw until hand >= 3 cards
   * Update currentTurnPlayerId
   */
  private startTurn(player: Player): void {
    if (this.state.status !== "playing") return;

    player.itslamPlayedThisTurn = false;
    this.log(`It's ${player.name}'s turn`);

    const initialHandSize = player.hand.length;
    this.drawCard(player);
    while (player.hand.length < 3 && this.state.drawPile.length > 0) {
      this.drawCard(player);
    }

    const drawnCount = player.hand.length - initialHandSize;
    if (drawnCount > 0) {
      const cardAmt = drawnCount === 1 ? "card" : "cards";
      this.log(`${player.name} drew ${drawnCount} ${cardAmt}`);
    }
  }

  /**
   * End turn: discard down to 7 cards (preserve itslam cards)
   * Move to next player
   * Trigger final round if draw pile empty
   */
  public endTurn(playerId: string, cardIdsToDiscard: string[]): void {
    if (this.state.status !== "playing") return;
    if (playerId !== this.state.currentTurnPlayerId) return;

    const player = this.findPlayerById(playerId);
    if (!player) return;

    if (player.hand.length > 7) {
      if (player.hand.length - cardIdsToDiscard.length < 7) {
        let discardedCount = 0;
        for (const cardId of cardIdsToDiscard) {
          const cardIndex = this.findCardIndexById(player, cardId);
          if (cardIndex !== undefined) {
            const card = player.hand[cardIndex];
            if (card.type === "itslam") {
              console.error("Cannot discard ITSLAM cards.");
              continue;
            }
            this.discardCard(player, card);
            discardedCount++;
          }
        }
        if (discardedCount > 0) {
          const cardAmt = discardedCount === 1 ? "card" : "cards";
          this.log(
            `${player.name} discarded ${discardedCount} ${cardAmt} due to hand overflow`,
          );
        }
      } else {
        console.error(
          "Cannot discard that many cards, only discard until you're down to 7 cards in hand.",
        );
      }
    }

    const nextPlayer = this.getNextPlayer();
    if (!nextPlayer) return;
    this.state.currentTurnPlayerId = nextPlayer.id;

    if (this.isGameOver()) {
      this.state.status = "finished";
      const scores = this.getGameScore();
      const winners = this.getWinner();
      const scoreStr = this.state.players
        .map((p) => `${p.name}: ${scores[p.name]}`)
        .join(", ");
      const winnerNames = winners.map((w) => w.name).join(" & ");
      const verb = winners.length > 1 ? "win" : "wins";
      this.log(
        `Game over! ${winnerNames} ${verb} with ${scores[winners[0].name]} points (${scoreStr})`,
      );
      return;
    }

    this.startTurn(nextPlayer);
  }

  // Currently unused
  private getCurrentPlayer(): Player | undefined {
    return this.findPlayerById(this.state.currentTurnPlayerId);
  }

  private getNextPlayer(): Player | undefined {
    const currentIndex = this.state.players.findIndex(
      (player) => player.id === this.state.currentTurnPlayerId,
    );
    if (currentIndex === -1) return undefined; // Not actually needed since we don't plan removals
    const nextIndex = (currentIndex + 1) % this.state.players.length;
    return this.state.players[nextIndex];
  }

  // ========== CARD DRAWING & PLAYING ==========
  /**
   * Draw card from draw pile
   * Add to player hand
   * Trigger final round if draw pile empties
   */
  private drawCard(player: Player): void {
    if (this.state.status !== "playing") return;

    if (this.state.drawPile.length === 0) return;
    this.addCardToHand(player, this.state.drawPile.pop() as Card);
    if (this.state.drawPile.length === 0) {
      this.triggerFinalRound();
    }
  }

  /**
   * Discard a card from player's hand
   * Add to discard pile
   */
  private discardCard(player: Player, card: Card): void {
    const discardedCard = this.removeCardFromHand(player, card);
    if (!discardedCard) return;

    this.state.discardPile.push(discardedCard);
  }

  /**
   * Play card(s) from hand based on type:
   *
   * Multicard (2 or 3):
   * - Forming a sheep on your board (with 2 parts and an optional modifier): call formSheep()
   *
   * Singlecard:
   * - Modifying an existing sheep on ANY board (if you're only swapping 1 part of the sheep): call swapSheepPart()
   * - Actions: call playActionCard()
   * - ITSLAM: call playItslamCard()
   */
  public playCards(
    playerId: string,
    cardIds: string[],
    targetPlayerId?: string,
    targetSheepIndex?: number,
    targetPartIndex?: number,
    chosenIndices?: number[],
  ): boolean {
    if (this.state.status !== "playing") return false;

    // validate player
    const player = this.findPlayerById(playerId);
    if (!player) return false;

    // validate cards exist in hand
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const cardIndex = this.findCardIndexById(player, cardId);
      if (cardIndex === undefined) return false;
      cards.push(player.hand[cardIndex]);
    }

    // validate target player if provided
    const targetPlayer = targetPlayerId
      ? this.findPlayerById(targetPlayerId)
      : undefined;
    if (targetPlayerId && !targetPlayer) return false;

    // turn gating, reflip as sole exception
    if (playerId !== this.state.currentTurnPlayerId) {
      const isReFlip = cards[0]?.name === "ReFlip";
      const flipInGracePeriod =
        this.state.activeCoinFlip?.phase === "grace_period";
      if (!isReFlip || !flipInGracePeriod) return false;
    }

    let success = false;
    switch (cardIds.length) {
      // action, itslam, single-part-swap (playing modifier alone is illegal)
      case 1: {
        const card = cards[0];
        if (card.name === "ReFlip") {
          success = this.playReFlipCard(playerId, card.id);
          break;
        } else if (card.type === "action") {
          success = targetPlayer
            ? this.playActionCard(
                player,
                card,
                targetPlayer,
                targetSheepIndex,
                chosenIndices,
              )
            : false;
          break;
        } else if (card.type === "itslam") {
          success = this.playItslamCard(player, card, targetPlayer); // no targetPlayer gating for recover 1 sheep
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
      // 2 parts
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
        const parts = cards.filter(
          (c: Card) => c.type === "head" || c.type === "butt",
        );
        const modifier = cards.find((c: Card) => c.type === "modifier");
        if (parts.length === 2 && modifier) {
          success = this.formSheep(player, [parts[0], parts[1]], modifier);
          break;
        } else {
          success = false;
          break;
        }
      }
      default:
        success = false;
    }

    if (!success) return false;

    const isFormOrSwap =
      cardIds.length >= 2 ||
      cards[0].type === "head" ||
      cards[0].type === "butt";
    if (isFormOrSwap) {
      // Cards are now in play, don't need to be discarded
      for (const card of cards) this.removeCardFromHand(player, card);
    } else {
      // Discard action/itslam cards
      for (const card of cards) this.discardCard(player, card);
    }

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
      this.addSheepToField(player, candidate);

      this.log(`${player.name} formed a ${this.describeSheep(candidate)}.`);
      return true;
    }

    if (!this.canApplyModifier(candidate, modifier)) return false;
    this.applyModifier(candidate, modifier);
    this.addSheepToField(player, candidate);

    this.log(`${player.name} formed a ${this.describeSheep(candidate)}.`);
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
    this.addCardToHand(player, oldPart);

    if (modifierNowRedundant) {
      targetSheep.modifier = undefined;
      this.addCardToHand(player, oldModifier);
    }

    const fieldOwner =
      targetPlayer.id === player.id ? "their own" : `${targetPlayer.name}'s`;
    this.log(
      `${player.name} swapped a ${oldPart.color} ${oldPart.type} on ${fieldOwner} field`,
    );
    return true;
  }

  /**
   * Route action card to handler
   */
  private playActionCard(
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
        success = this.handleYoink(player, targetPlayer, chosenIndices);
        break;
      case "Wheat":
        if (targetSheepIndex === undefined) return false;
        success = this.handleWheat(player, targetPlayer, targetSheepIndex);
        break;
      case "Wolf":
        if (targetSheepIndex === undefined) return false;
        success = this.handleWolf(player, targetPlayer, targetSheepIndex);
        break;
    }

    return success;
  }

  // ========== ACTION CARD HANDLERS ==========
  /**
   * Yoink: Steal 2 cards face-down from opponent's hand
   * You get to see the target's hand face down to pick from, where there's a clear order (oldest left -> newest right) for how long the card has been in their hand
   * Automatically steal all if target has 1 or 2 cards
   * !HAND MANIPULATION MUST RESPECT CARD ORDER FOR THIS TO WORK, DO NOT SHUFFLE/RANDOMIZE ANY HAND MANIPULATION
   */
  private handleYoink(
    player: Player,
    targetPlayer: Player,
    chosenIndices: number[],
  ): boolean {
    const expectedCount = Math.min(2, targetPlayer.hand.length);
    if (chosenIndices.length !== expectedCount) return false;

    const uniqueIndices = new Set(chosenIndices);
    if (uniqueIndices.size !== chosenIndices.length) return false;

    for (const idx of chosenIndices) {
      if (idx < 0 || idx >= targetPlayer.hand.length) return false;
    }

    // remove highest index first so earlier indices don't shift
    const sortedDescending = [...chosenIndices].sort((a, b) => b - a);
    for (const idx of sortedDescending) {
      const stolenCard = targetPlayer.hand.splice(idx, 1)[0];
      if (stolenCard) this.addCardToHand(player, stolenCard);
    }

    const cardAmt = expectedCount === 1 ? "card" : "cards";
    this.log(
      `${player.name} yoinked ${expectedCount} ${cardAmt} from ${targetPlayer.name}'s hand`,
    );
    return true;
  }

  /**
   * Wheat: Steal 1 sheep from opponent's field
   * - Check isProtectedFromWheat
   * - Move to active player's field
   */
  private handleWheat(
    player: Player,
    targetPlayer: Player,
    targetSheepIndex: number,
  ): boolean {
    if (this.isFieldProtectedFromWheat(targetPlayer.field)) return false;
    const sheep = this.removeSheepFromField(targetPlayer, targetSheepIndex);
    if (!sheep) return false;

    this.addSheepToField(player, sheep);

    this.log(
      `${player.name} lured ${this.describeSheep(sheep)} from ${targetPlayer.name}'s field with Wheat`,
    );
    return true;
  }

  /**
   * Wolf: Discard 1 sheep from opponent's field
   * - Check isProtectedFromWolf
   * - Send sheep parts + modifier to discard pile
   */
  private handleWolf(
    player: Player,
    targetPlayer: Player,
    targetSheepIndex: number,
  ): boolean {
    if (this.isFieldProtectedFromWolf(targetPlayer.field)) return false;
    const sheep = this.removeSheepFromField(targetPlayer, targetSheepIndex);
    if (!sheep) return false;

    this.state.discardPile.push(...sheep.parts);
    if (sheep.modifier) this.state.discardPile.push(sheep.modifier);

    this.log(
      `${targetPlayer.name}'s ${this.describeSheep(sheep)} was eaten by ${player.name}'s Wolf`,
    );
    return true;
  }

  // ========== ITSLAM CARD HANDLERS ==========
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
  private playItslamCard(
    player: Player,
    card: Card,
    targetPlayer?: Player,
  ): boolean {
    if (this.state.activeCoinFlip) return false;
    if (player.itslamPlayedThisTurn) return false;
    if (targetPlayer && player.id === targetPlayer?.id) return false;
    if (card.name !== "Recover 1 Sheep" && !targetPlayer) return false;

    this.state.activeCoinFlip = {
      challengerId: player.id,
      defenderId: targetPlayer?.id,
      cardId: card.id,
      cardName: card.name,
      phase: "awaiting_prediction",
      reFlipCount: 0,
    };

    player.itslamPlayedThisTurn = true;
    return true;
  }

  public submitPrediction(
    playerId: string,
    prediction: "looking" | "not_looking",
  ): boolean {
    if (
      !this.state.activeCoinFlip ||
      this.state.activeCoinFlip.phase !== "awaiting_prediction"
    )
      return false;
    if (playerId !== this.state.activeCoinFlip.challengerId) return false;

    this.state.activeCoinFlip.prediction = prediction;
    this.state.activeCoinFlip.phase = "flipping";

    return true;
  }

  // This probably shouldn't even live as a method on GameEngine if you want to keep "pure deterministic replay" cleanly separated from "the one random roll." Worth considering: put generateFlipResult in the Svelte component / MQTT layer that's specifically marked as host-only logic, and keep GameEngine itself free of any Math.random() calls except inside createInitialDeck's shuffle (which already gets the same "host computes, broadcasts the result" treatment). That keeps the engine's public API surface = "things that get broadcast and replayed," and nothing inside it secretly rolls dice.
  public generateFlipResult(): "looking" | "not_looking" {
    return Math.random() < 0.5 ? "looking" : "not_looking";
  }

  /**
   * Host-only call: host generates the actual random result locally,
   * then broadcasts it via this method so every client (including host) applies the same value
   */
  public submitFlipResult(
    playerId: string,
    result: "looking" | "not_looking",
  ): boolean {
    if (playerId !== this.state.hostId) return false;

    const flip = this.state.activeCoinFlip;
    if (!flip || flip.phase !== "flipping") return false;

    flip.result = result;
    flip.graceWindowEndsAt = Date.now() + 5000; // 5 seconds grace period
    flip.phase = "grace_period";

    return true;
  }

  private determineFlipWinner(flip: CoinFlipState): string | undefined {
    const guessedCorrectly = flip.prediction === flip.result;

    return guessedCorrectly
      ? flip.challengerId
      : (flip.defenderId ?? undefined);
  }

  /**
   * Re-flip: Allow re-rolling an ITSLAM coin flip (targets a coin flip, not a player)
   * - Used in response to ITSLAM card flip result
   * - ANYONE can play this in response to a coin flip, even if it's not their turn
   * - Flip result must have ~5 grace period to allow for re-flip to be played
   * - No limits on usage (we only have 2 though)
   */
  public playReFlipCard(playerId: string, cardId: string): boolean {
    const flip = this.state.activeCoinFlip;
    if (!flip || flip.phase !== "grace_period") return false;

    flip.prediction = undefined;
    flip.result = undefined;
    flip.winnerId = undefined;
    flip.graceWindowEndsAt = undefined;
    flip.reFlipCount += 1;
    flip.phase = "awaiting_prediction";

    this.log(
      `${this.findPlayerById(playerId)?.name ?? "A player"} played a Re-flip card! Restarting the prediction phase...`,
    );
    return true;
  }

  public finalizeCoinFlip(playerId: string): void {
    if (playerId !== this.state.hostId) return;

    const flip = this.state.activeCoinFlip;
    if (!flip || flip.phase !== "grace_period") return;

    if (flip.graceWindowEndsAt === undefined) return;
    if (Date.now() < flip.graceWindowEndsAt) return;

    const winner = this.determineFlipWinner(flip);
    flip.winnerId = winner;
    flip.phase = "resolved";

    this.log(
      `Coin flip resolved: ${winner ? this.findPlayerById(winner)?.name : "No one"} won the flip (${flip.prediction} vs ${flip.result})`,
    );
  }

  public resolveItslamEffect(
    playerId: string,
    sheepIndices?: number[],
    discardIndices?: number[],
  ): boolean {
    const flip = this.state.activeCoinFlip;
    if (!flip || flip.phase !== "resolved") return false;
    if (playerId !== flip.winnerId) return false;

    const winner = this.findPlayerById(flip.winnerId);
    const loserId = flip.defenderId
      ? flip.winnerId === flip.challengerId
        ? flip.defenderId
        : flip.challengerId
      : undefined;
    const loser = loserId ? this.findPlayerById(loserId) : undefined;
    if (!winner) return false;

    switch (flip.cardName) {
      case "Lure 2 Sheep":
        if (!loser || !sheepIndices || sheepIndices.length > 2) return false;
        this.handleLure2Sheep(winner, loser, sheepIndices);
        break;
      case "Remove 2 Sheep":
        if (!loser || !sheepIndices || sheepIndices.length > 2) return false;
        this.handleRemove2Sheep(loser, sheepIndices);
        break;
      case "Yoink Entire Hand":
        if (!loser) return false;
        this.handleYoinkEntireHand(winner, loser);
        break;
      case "Halve 2 Sheep":
        if (!loser || !sheepIndices || sheepIndices.length > 2) return false;
        this.handleHalve2Sheep(winner, loser, sheepIndices);
        break;
      case "Recover 1 Sheep":
        if (
          !discardIndices ||
          discardIndices.length < 1 ||
          discardIndices.length > 3
        )
          return false;
        this.handleRecover1Sheep(winner, discardIndices);
        break;
      default:
        return false;
    }

    this.state.activeCoinFlip = undefined;
    return true;
  }

  private validateSheepIndices(player: Player, indices: number[]): boolean {
    if (indices.length === 0) return false;
    const uniqueIndices = new Set(indices);
    if (uniqueIndices.size !== indices.length) return false;
    for (const idx of indices) {
      if (idx < 0 || idx >= player.field.length) return false;
    }
    return true;
  }

  /**
   * Lure 2 sheep: Move 2 sheep from opponent's field to beneficiary's field
   */
  private handleLure2Sheep(
    winner: Player,
    loser: Player,
    sheepIndices: number[],
  ): boolean {
    if (!this.validateSheepIndices(loser, sheepIndices)) return false;
    // TODO: Implement
    return true;
  }

  /**
   * Remove 2 sheep: Send 2 sheep from target's field to discard pile
   * Discard parts + modifiers
   */
  private handleRemove2Sheep(loser: Player, sheepIndices: number[]): boolean {
    if (!this.validateSheepIndices(loser, sheepIndices)) return false;
    // TODO: Implement
    return true;
  }

  /**
   * Yoink entire hand: Transfer all cards from opponent's hand to beneficiary's hand
   */
  private handleYoinkEntireHand(winner: Player, loser: Player): boolean {
    // TODO: Implement
    return true;
  }

  /**
   * Halve 2 sheep: Deconstruct 2 sheep (max) from target's field
   * - Beneficiary takes 1 part + modifier from each sheep
   * - Target gets remaining part back to hand from each sheep
   */
  private handleHalve2Sheep(
    winner: Player,
    loser: Player,
    sheepIndices: number[],
  ): boolean {
    // TODO: Implement
    return true;
  }

  /**
   * Recover 1 sheep: Find any valid sheep combination in discard pile
   * Play it to beneficiary's field
   * Remove from discard pile
   */
  private handleRecover1Sheep(
    winner: Player,
    discardIndices: number[],
  ): boolean {
    // TODO: Implement
    return true;
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
  private getGameScore(): Record<string, number> {
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
    if (this.state.isFinalRound) return;

    this.state.isFinalRound = true;
    this.state.finalRoundTriggeredBy = this.state.currentTurnPlayerId;
    const trigger = this.findPlayerById(this.state.currentTurnPlayerId);
    this.log(
      `The draw pile is empty! ${trigger?.name ?? "A player"} triggered the final round`,
    );
  }

  /**
   * Check if game is over
   * - Final round active + all players have taken final turn
   */
  public isGameOver(): boolean {
    if (!this.state.isFinalRound) return false;

    if (this.state.finalRoundTriggeredBy === undefined) return false;

    return this.state.currentTurnPlayerId === this.state.finalRoundTriggeredBy;
  }

  /**
   * Get winner(s) - player(s) with highest score
   */
  public getWinner(): Player[] {
    const scores = this.getGameScore();

    const highestScore = Math.max(...Object.values(scores));
    const winners = this.state.players.filter(
      (player) => scores[player.name] === highestScore,
    );

    return winners;
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

  /**
   * Return a "blind" version of the player's hand, where the cards are face down and only their order is known.
   * This is necessary for Yoink, where the opponent can see the order of cards but not their identities.
   */
  public getPlayerHandBlind(playerId: string): { count: number } {
    const player = this.findPlayerById(playerId);
    if (!player) return { count: 0 };
    return { count: player.hand.length };
  }

  public getRemainingDeckSize(): number {
    return this.state.drawPile.length;
  }

  public getDiscardPileSize(): number {
    return this.state.discardPile.length;
  }

  // For regular discard pile viewing and itslam "Recover 1 sheep"
  public getDiscardPile(): Card[] {
    return this.state.discardPile;
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

  private findCardIndexById(
    player: Player,
    cardId: string,
  ): number | undefined {
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      console.error(`Card ${cardId} not found in player ${player.id}'s hand.`);
      return undefined;
    }
    return cardIndex;
  }

  private findCardInHand(player: Player, card: Card): number | undefined {
    return this.findCardIndexById(player, card.id);
  }

  private removeCardFromHand(player: Player, card: Card): Card | undefined {
    const cardIndex = this.findCardInHand(player, card);
    if (cardIndex === undefined) return undefined;
    return player.hand.splice(cardIndex, 1)[0];
  }

  private addCardToHand(player: Player, card: Card): void {
    player.hand.push(card);
  }

  private addSheepToField(player: Player, sheep: Sheep): void {
    player.field.push(sheep);
  }

  private removeSheepFromField(
    player: Player,
    sheepIndex: number,
  ): Sheep | undefined {
    const sheep = player.field[sheepIndex];
    if (!sheep) {
      console.error(
        `Sheep at index ${sheepIndex} not found on player ${player.id}'s field.`,
      );
      return undefined;
    }
    return player.field.splice(sheepIndex, 1)[0];
  }

  private describeSheep(sheep: Sheep): string {
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

  private log(message: string): void {
    this.state.gameLog.push({
      id: crypto.randomUUID(),
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

export const gameEngine = new GameEngine();
