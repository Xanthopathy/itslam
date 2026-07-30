import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { playReFlipCard, resolveItslamEffect } from "../src/lib/game/itslam.ts";
import type { GameState } from "../src/lib/types.ts";

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
});
