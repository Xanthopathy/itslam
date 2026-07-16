// src/lib/network/dispatcher.ts
//
// Centralizes "call gameEngine AND publish it to the room" so components
// don't each need their own networking glue. Every mutating action still
// calls gameEngine directly (local apply), and ALSO publishes so local state
// updates immediately without waiting on network round-trips.
import { gameEngine, getGameStateSnapshot } from "../gameStore.svelte";
import { NetworkClient } from "./client";
import { canPublishAction } from "./host";
import type { RoomAction, RoomActionMessage } from "./messages";

const LOCALLY_APPLIED_ACTIONS = new Set<RoomAction["type"]>([
  "PLAY_CARDS",
  "END_TURN",
  "SUBMIT_PREDICTION",
  "SUBMIT_FLIP_RESULT",
  "FINALIZE_COIN_FLIP",
  "RESOLVE_ITSLAM",
]);

export type Dispatcher = {
  publish: (action: RoomAction) => Promise<void>;
  applyIncoming: (message: RoomActionMessage) => void;
};

export function createDispatcher(
  networkClient: NetworkClient,
  roomCode: string,
  localPlayerId: string,
  isHost: () => boolean,
): Dispatcher {
  async function publish(action: RoomAction) {
    if (!canPublishAction(action.type, isHost())) return;

    await networkClient.publishToRoom({
      ...action,
      roomCode,
      playerId: localPlayerId,
      sentAt: Date.now(),
    });

    if (action.type !== "SYNC_STATE" && action.type !== "REQUEST_SYNC_STATE") {
      publishRetainedStateIfHost();
    }
  }

  async function awaitSyncState(): Promise<void> {
    await networkClient.publishToRoom({
      type: "SYNC_STATE",
      payload: { state: getGameStateSnapshot() },
      roomCode,
      playerId: localPlayerId,
      sentAt: Date.now(),
    }, { retain: true });
  }

  function publishRetainedStateIfHost(): void {
    if (isHost() && gameEngine.state.status !== "lobby") {
      void awaitSyncState();
    }
  }

  /**
   * Applies an action received FROM ANOTHER CLIENT to local gameEngine state. This is the other half of "apply locally + publish" - each client's local action is applied via the direct gameEngine call at the call site (see GameBoard/ChaosModal), while this function is what makes everyone ELSE'S actions take effect on your client.
   */
  async function applyIncoming(message: RoomActionMessage): Promise<void> {
    if (
      message.playerId === localPlayerId &&
      LOCALLY_APPLIED_ACTIONS.has(message.type)
    )
      return;

    switch (message.type) {
      case "PLAYER_JOINED":
        break;
      case "PLAY_CARDS":
        gameEngine.playCards(
          message.playerId,
          message.payload.cardIds,
          message.payload.targetPlayerId,
          message.payload.targetSheepIndex,
          message.payload.targetPartIndex,
          message.payload.chosenIndices,
        );
        publishRetainedStateIfHost();
        break;
      case "END_TURN":
        gameEngine.endTurn(message.playerId, message.payload.cardIdsToDiscard);
        publishRetainedStateIfHost();
        break;
      case "SUBMIT_PREDICTION":
        gameEngine.submitPrediction(
          message.playerId,
          message.payload.prediction,
        );
        publishRetainedStateIfHost();
        break;
      case "SUBMIT_FLIP_RESULT":
        gameEngine.submitFlipResult(message.playerId, message.payload.result);
        publishRetainedStateIfHost();
        break;
      case "FINALIZE_COIN_FLIP":
        gameEngine.finalizeCoinFlip(message.playerId);
        publishRetainedStateIfHost();
        break;
      case "RESOLVE_ITSLAM":
        gameEngine.resolveItslamEffect(
          message.playerId,
          message.payload.sheepIndices,
          message.payload.targetPartIndices,
          message.payload.discardIndices,
        );
        publishRetainedStateIfHost();
        break;
      case "SYNC_STATE":
        gameEngine.loadState(message.payload.state);
        break;
      case "REQUEST_SYNC_STATE":
        if (
          message.playerId !== localPlayerId &&
          gameEngine.state.status !== "lobby"
        ) {
          void awaitSyncState();
        }
        break;
      // INIT_GAME / PLAYER_JOINED are handled by the lobby or host flow.
      default:
        break;
    }
  }

  return { publish, applyIncoming };
}
