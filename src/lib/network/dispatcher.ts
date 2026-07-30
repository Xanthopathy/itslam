// src/lib/network/dispatcher.ts
//
// Host-authoritative dispatcher.
//
// - Host: applies every action locally via gameEngine, then broadcasts the
//   full state snapshot (SYNC_STATE) to all clients.
// - Clients: send intents to the host; only process SYNC_STATE messages.
// - No more "apply locally + publish" pattern, no echo guards, no retained-
//   state debounce. The host is the single source of truth.
import { gameEngine, getGameStateSnapshot } from "../gameStore.svelte";
import { NetworkClient } from "./client";
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
  function applyAction(action: RoomAction, playerId: string): void {
    switch (action.type) {
      case "PLAY_CARDS":
        gameEngine.playCards(
          playerId,
          action.payload.cardIds,
          action.payload.targetPlayerId,
          action.payload.targetSheepIndex,
          action.payload.targetPartIndex,
          action.payload.chosenIndices,
        );
        break;
      case "END_TURN":
        gameEngine.endTurn(playerId, action.payload.cardIdsToDiscard);
        break;
      case "SUBMIT_PREDICTION":
        gameEngine.submitPrediction(playerId, action.payload.prediction);
        break;
      case "SUBMIT_FLIP_RESULT":
        gameEngine.submitFlipResult(playerId, action.payload.result);
        break;
      case "FINALIZE_COIN_FLIP":
        gameEngine.finalizeCoinFlip(playerId);
        break;
      case "RESOLVE_ITSLAM":
        gameEngine.resolveItslamEffect(
          playerId,
          action.payload.sheepIndices,
          action.payload.targetPartIndices,
          action.payload.discardIndices,
        );
        break;
      default:
        break;
    }
  }

  async function broadcastSyncState(): Promise<void> {
    await networkClient.publishToRoom(
      {
        type: "SYNC_STATE",
        payload: { state: getGameStateSnapshot() },
        roomCode,
        playerId: localPlayerId,
        sentAt: Date.now(),
      },
      { retain: true },
    );
  }

  async function publish(action: RoomAction) {
    if (isHost()) {
      // Host: apply locally (skip SYNC_STATE — caller already updated state),
      // then broadcast the resulting snapshot.
      if (action.type !== "SYNC_STATE") {
        applyAction(action, localPlayerId);
      }
      await broadcastSyncState();
    } else {
      // Client: send intent to the host.
      await networkClient.publishToRoom({
        ...action,
        roomCode,
        playerId: localPlayerId,
        sentAt: Date.now(),
      });
    }
  }

  async function applyIncoming(message: RoomActionMessage): Promise<void> {
    // Echo guard: skip messages we sent ourselves.
    if (message.playerId === localPlayerId) return;

    if (isHost()) {
      if (message.type === "REQUEST_SYNC_STATE") {
        // Late-joiner: broadcast current state.
        await broadcastSyncState();
        return;
      }
      if (message.type === "PLAYER_JOINED" || message.type === "PLAYER_LIST_REQUEST") {
        return; // handled by lobby flow
      }
      // Host: process other players' intents, then broadcast state.
      applyAction(message, message.playerId);
      await broadcastSyncState();
    } else if (message.type === "SYNC_STATE") {
      // Clients: only process full state snapshots.
      gameEngine.loadState(message.payload.state);
    }
  }

  return { publish, applyIncoming };
}
