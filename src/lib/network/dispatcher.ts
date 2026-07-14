// src/lib/network/dispatcher.ts
//
// Centralizes "call gameEngine AND publish it to the room" so components
// don't each need their own networking glue. Every mutating action still
// calls gameEngine directly (local apply), and ALSO publishes - this is a
// deliberate choice, not a placeholder: BroadcastChannel doesn't echo a
// client's own publish back to itself, so publish-only would mean your own
// actions never take effect locally. Once the real MQTT adapter is wired in
// (which likely DOES echo), the echo-guard step (next up) is what prevents
// a double-apply of these same local actions.
import { gameEngine, getGameStateSnapshot } from "../gameStore.svelte";
import { NetworkClient } from "./client";
import { canPublishAction } from "./host";
import type { RoomAction, RoomActionMessage } from "./messages";

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
  }

  async function awaitSyncState(): Promise<void> {
    await networkClient.publishToRoom({
      type: "SYNC_STATE",
      payload: { state: getGameStateSnapshot() },
      roomCode,
      playerId: localPlayerId,
      sentAt: Date.now(),
    });
  }

  /**
   * Applies an action received FROM ANOTHER CLIENT to local gameEngine state. This is the other half of "apply locally + publish" - each client's local action is applied via the direct gameEngine call at the call site (see GameBoard/ChaosModal), while this function is what makes everyone ELSE'S actions take effect on your client.
   */
  async function applyIncoming(message: RoomActionMessage): Promise<void> {
    switch (message.type) {
      case "PLAYER_JOINED":
        if (isHost() && gameEngine.state.status === "playing") {
          void awaitSyncState(); // void to avoid unhandled promise warning
        }
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
        break;
      case "END_TURN":
        gameEngine.endTurn(message.playerId, message.payload.cardIdsToDiscard);
        break;
      case "SUBMIT_PREDICTION":
        gameEngine.submitPrediction(
          message.playerId,
          message.payload.prediction,
        );
        break;
      case "SUBMIT_FLIP_RESULT":
        gameEngine.submitFlipResult(message.playerId, message.payload.result);
        break;
      case "FINALIZE_COIN_FLIP":
        gameEngine.finalizeCoinFlip(message.playerId);
        break;
      case "RESOLVE_ITSLAM":
        gameEngine.resolveItslamEffect(
          message.playerId,
          message.payload.sheepIndices,
          message.payload.targetPartIndices,
          message.payload.discardIndices,
        );
        break;
      case "SYNC_STATE":
        gameEngine.loadState(message.payload.state);
        break;
      // INIT_GAME / PLAYER_JOINED are handled by the lobby or host flow.
      default:
        break;
    }
  }

  return { publish, applyIncoming };
}
