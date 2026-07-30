import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getEffectiveCoinFlipPhase,
  playReFlipCard,
  resolveItslamEffect,
} from "../src/lib/game/itslam.ts";
import { playActionCard } from "../src/lib/game/actions.ts";
import type { GameState, Card } from "../src/lib/types.ts";

function createState(): GameState {
  return {
    stateVersion: 1,
    players: [
      {
        id: "p1",
        name: "Alpha",
        hand: [],
        field: [],
        itslamPlayedThisTurn: false,
      },
      {
        id: "p2",
        name: "Beta",
        hand: [],
        field: [],
        itslamPlayedThisTurn: false,
      },
    ],
    drawPile: [],
    discardPile: [],
    currentTurnPlayerId: "p1",
    roundNumber: 1,
    status: "playing",
    gameLog: [],
    activeCoinFlip: {
      challengerId: "p1",
      defenderId: "p2",
      cardId: "flip-1",
      cardName: "Lure 2 Sheep",
      phase: "resolved",
      winnerId: "p1",
      reFlipCount: 0,
    },
    isFinalRound: false,
    hostId: "p1",
  };
}

describe("ITSLAM resolution", () => {
  it("allows resolving a lure effect with zero sheep selections", () => {
    const state = createState();
    const success = resolveItslamEffect(state, "p1", []);

    assert.equal(success, true);
    assert.equal(state.activeCoinFlip, undefined);
  });

  it("allows ReFlip during the grace buffer window after the countdown", () => {
    const state = createState();
    state.activeCoinFlip = {
      challengerId: "p1",
      defenderId: "p2",
      cardId: "flip-2",
      cardName: "Lure 2 Sheep",
      phase: "grace_period",
      prediction: "looking",
      result: "not_looking",
      winnerId: "p2",
      graceDeadlineAt: Date.now() - 10,
      reFlipCount: 0,
    };

    const success = playReFlipCard(state, "p1");

    assert.equal(success, true);
    assert.equal(state.activeCoinFlip?.phase, "awaiting_prediction");
  });

  it("treats a re-flipped grace-period state as awaiting prediction for the UI", () => {
    const state = createState();
    state.activeCoinFlip = {
      challengerId: "p1",
      defenderId: "p2",
      cardId: "flip-3",
      cardName: "Lure 2 Sheep",
      phase: "grace_period",
      prediction: undefined,
      result: undefined,
      reFlipCount: 1,
    };

    const phase = getEffectiveCoinFlipPhase(state.activeCoinFlip);

    assert.equal(phase, "awaiting_prediction");
  });

  it("allows Yoink to steal cards from the target hand when no indices are supplied", () => {
    const state = createState();
    const yoinkCard: Card = { id: "yoink-1", name: "Yoink", type: "action" };
    const targetHandCardA: Card = {
      id: "card-a",
      name: "Card A",
      type: "head",
    };
    const targetHandCardB: Card = {
      id: "card-b",
      name: "Card B",
      type: "butt",
    };

    state.players[0].hand = [yoinkCard];
    state.players[1].hand = [targetHandCardA, targetHandCardB];

    const success = playActionCard(
      state,
      state.players[0],
      yoinkCard,
      state.players[1],
    );

    assert.equal(success, true);
    assert.equal(state.players[0].hand.length, 3);
    assert.equal(state.players[1].hand.length, 0);
    assert.deepEqual(
      state.players[0].hand.slice(1).map((card) => card.id),
      ["card-a", "card-b"],
    );
  });

  it("allows Recover 1 Sheep to clear the coin flip when no winner is determined", () => {
    const state = createState();
    state.activeCoinFlip = {
      challengerId: "p1",
      cardId: "flip-3",
      cardName: "Recover 1 Sheep",
      phase: "resolved",
      prediction: "looking",
      result: "not_looking",
      reFlipCount: 0,
    };

    const success = resolveItslamEffect(state, "p1", [], [], []);

    assert.equal(success, true);
    assert.equal(state.activeCoinFlip, undefined);
  });
});
