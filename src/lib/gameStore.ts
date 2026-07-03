// src/lib/gamestore.ts
import type { Card, GameState, Player, Sheep } from "./types";
import { createInitialDeck, shuffle } from "./game/deck";
import { formSheep, swapSheepPart } from "./game/sheep";
import { playActionCard } from "./game/actions";
import {
  finalizeCoinFlip,
  generateFlipResult,
  playItslamCard,
  playReFlipCard,
  resolveItslamEffect,
  submitFlipResult,
  submitPrediction,
} from "./game/itslam";
import {
  getGameScore,
  getWinner,
  isGameOver,
  triggerFinalRound,
} from "./game/scoring";
import {
  addCardToHand,
  discardCard,
  findCardIndexById,
  findPlayerById,
  log,
  removeCardFromHand,
} from "./game/utils";

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

  // ========== GAME LIFECYCLE ==========

  // IMPORTANT: Because we're using MQTT, the host will be the one to run InitGame() and then send the full deck to all clients. This ensures that all clients have the same deck order and can validate game state independently.
  // The host will broadcast every other RNG event as well.
  // TODO: Make sure to freeze the game if the host disconnects
  public InitGame(playerNames: string[]): void {
    if (this.state.status === "playing") return;

    const fullDeck = shuffle(createInitialDeck());

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
          addCardToHand(player, card);
        }
      }
    });

    this.state.drawPile = fullDeck;

    // Shuffle player-order, then select starting index
    this.state.players = shuffle(this.state.players);
    const randomIndex = Math.floor(Math.random() * this.state.players.length);
    this.state.currentTurnPlayerId = this.state.players[randomIndex].id;

    const firstPlayer = findPlayerById(
      this.state,
      this.state.currentTurnPlayerId,
    );
    if (!firstPlayer) return;

    this.state.status = "playing";
    log(this.state, `Game started! ${firstPlayer.name} goes first`);
    this.startTurn(firstPlayer);
  }

  /**
   * Start turn: draw until hand >= 3 cards
   * Update currentTurnPlayerId
   */
  private startTurn(player: Player): void {
    if (this.state.status !== "playing") return;

    player.itslamPlayedThisTurn = false;
    log(this.state, `It's ${player.name}'s turn`);

    const initialHandSize = player.hand.length;
    this.drawCard(player);
    while (player.hand.length < 3 && this.state.drawPile.length > 0) {
      this.drawCard(player);
    }

    const drawnCount = player.hand.length - initialHandSize;
    if (drawnCount > 0) {
      const cardAmt = drawnCount === 1 ? "card" : "cards";
      log(this.state, `${player.name} drew ${drawnCount} ${cardAmt}`);
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

    const player = findPlayerById(this.state, playerId);
    if (!player) return;

    if (player.hand.length > 7) {
      if (player.hand.length - cardIdsToDiscard.length < 7) {
        let discardedCount = 0;
        for (const cardId of cardIdsToDiscard) {
          const cardIndex = findCardIndexById(player, cardId);
          if (cardIndex !== undefined) {
            const card = player.hand[cardIndex];
            if (card.type === "itslam") {
              console.error("Cannot discard ITSLAM cards.");
              continue;
            }
            discardCard(this.state, player, card);
            discardedCount++;
          }
        }
        if (discardedCount > 0) {
          const cardAmt = discardedCount === 1 ? "card" : "cards";
          log(
            this.state,
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

    if (isGameOver(this.state)) {
      this.state.status = "finished";
      const scores = getGameScore(this.state);
      const winners = getWinner(this.state);
      const scoreStr = this.state.players
        .map((p) => `${p.name}: ${scores[p.name]}`)
        .join(", ");
      const winnerNames = winners.map((w) => w.name).join(" & ");
      const verb = winners.length > 1 ? "win" : "wins";
      log(
        this.state,
        `Game over! ${winnerNames} ${verb} with ${scores[winners[0].name]} points (${scoreStr})`,
      );
      return;
    }

    this.startTurn(nextPlayer);
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
    addCardToHand(player, this.state.drawPile.pop() as Card);
    if (this.state.drawPile.length === 0) {
      triggerFinalRound(this.state);
    }
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
    const player = findPlayerById(this.state, playerId);
    if (!player) return false;

    // validate cards exist in hand
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const cardIndex = findCardIndexById(player, cardId);
      if (cardIndex === undefined) return false;
      cards.push(player.hand[cardIndex]);
    }

    // validate target player if provided
    const targetPlayer = targetPlayerId
      ? findPlayerById(this.state, targetPlayerId)
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
          success = playReFlipCard(this.state, playerId);
          break;
        } else if (card.type === "action") {
          success = targetPlayer
            ? playActionCard(
                this.state,
                player,
                card,
                targetPlayer,
                targetSheepIndex,
                chosenIndices,
              )
            : false;
          break;
        } else if (card.type === "itslam") {
          success = playItslamCard(this.state, player, card, targetPlayer); // no targetPlayer gating for recover 1 sheep
          break;
        } else if (card.type === "head" || card.type === "butt") {
          if (
            !targetPlayer ||
            targetSheepIndex === undefined ||
            targetPartIndex === undefined
          )
            return false;
          success = swapSheepPart(
            this.state,
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
          success = formSheep(this.state, player, [parts[0], parts[1]]);
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
          success = formSheep(
            this.state,
            player,
            [parts[0], parts[1]],
            modifier,
          );
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
      for (const card of cards) removeCardFromHand(player, card);
    } else {
      // Discard action/itslam cards
      for (const card of cards) discardCard(this.state, player, card);
    }

    return true;
  }

  // ========== ITSLAM PASSTHROUGHS ==========

  public submitPrediction(
    playerId: string,
    prediction: "looking" | "not_looking",
  ): boolean {
    return submitPrediction(this.state, playerId, prediction);
  }

  public generateFlipResult(): "looking" | "not_looking" {
    return generateFlipResult();
  }

  public submitFlipResult(
    playerId: string,
    result: "looking" | "not_looking",
  ): boolean {
    return submitFlipResult(this.state, playerId, result);
  }

  public finalizeCoinFlip(playerId: string): void {
    finalizeCoinFlip(this.state, playerId);
  }

  public resolveItslamEffect(
    playerId: string,
    sheepIndices?: number[],
    targetPartIndices?: number[],
    discardIndices?: number[],
  ): boolean {
    return resolveItslamEffect(
      this.state,
      playerId,
      sheepIndices,
      targetPartIndices,
      discardIndices,
    );
  }

  // ========== SCORING & STATE PASSTHROUGHS ==========

  public isGameOver(): boolean {
    return isGameOver(this.state);
  }

  public getWinner() {
    return getWinner(this.state);
  }

  // ========== FIELD/HAND QUERIES ==========

  public getPlayerField(playerId: string): Sheep[] {
    const player = findPlayerById(this.state, playerId);
    if (!player) return [];
    return player.field;
  }

  public getPlayerHand(playerId: string): Card[] {
    const player = findPlayerById(this.state, playerId);
    if (!player) return [];
    return player.hand;
  }

  /**
   * Return a "blind" version of the player's hand, where the cards are face down and only their order is known.
   * This is necessary for Yoink, where the opponent can see the order of cards but not their identities.
   */
  public getPlayerHandBlind(playerId: string): { count: number } {
    const player = findPlayerById(this.state, playerId);
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
}

export const gameEngine = new GameEngine();
