// src/lib/network/dispatcher.ts
import { gameEngine } from "../gameStore";
import { NetworkClient } from "./client";
import { canPublishAction } from "./host";
import type { RoomAction, RoomActionMessage } from "./messages";

export function createDispatcher(
  networkClient: NetworkClient,
  roomCode: string,
  localPlayerId: string,
  isHost: () => boolean,
) {
  async function publish(action: RoomAction) {
    if (!canPublishAction(action.type, isHost())) return;
    await networkClient.publishToRoom({
      ...action,
      roomCode,
      playerId: localPlayerId,
      sentAt: Date.now(),
    });
  }

  function applyIncoming(message: RoomActionMessage) {
    switch (message.type) {
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
      // INIT_GAME / SYNC_STATE / PLAYER_JOINED already handled in LobbyModal
    }
  }

  return { publish, applyIncoming };
}
