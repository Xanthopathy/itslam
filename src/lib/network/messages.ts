// src/lib/network/messages.ts
import type { GameState } from "../types";

export type RoomAction =
  | { type: "INIT_GAME"; payload: { playerNames: string[] } }
  | {
      type: "PLAY_CARDS";
      payload: {
        cardIds: string[];
        targetPlayerId?: string;
        targetSheepIndex?: number;
        targetPartIndex?: number;
        chosenIndices?: number[];
      };
    }
  | { type: "END_TURN"; payload: { cardIdsToDiscard: string[] } }
  | {
      type: "SUBMIT_PREDICTION";
      payload: { prediction: "looking" | "not_looking" };
    }
  | {
      type: "SUBMIT_FLIP_RESULT";
      payload: { result: "looking" | "not_looking" };
    }
  | { type: "FINALIZE_COIN_FLIP"; payload: Record<string, never> }
  | {
      type: "RESOLVE_ITSLAM";
      payload: {
        sheepIndices?: number[];
        targetPartIndices?: number[];
        discardIndices?: number[];
      };
    }
  | { type: "SYNC_STATE"; payload: { state: GameState } };

export type RoomActionType = RoomAction["type"];

export type RoomActionMessage = RoomAction & {
  roomCode: string;
  playerId: string;
  sentAt: number;
};

const VALID_ACTION_TYPES = new Set<RoomActionType>([
  "INIT_GAME",
  "PLAY_CARDS",
  "END_TURN",
  "SUBMIT_PREDICTION",
  "SUBMIT_FLIP_RESULT",
  "FINALIZE_COIN_FLIP",
  "RESOLVE_ITSLAM",
  "SYNC_STATE",
]);

// can add full runtime payload validation per action but we're high-trust rn
export function isRoomActionMessage(
  value: unknown,
): value is RoomActionMessage {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<RoomActionMessage>;
  return (
    typeof candidate.type === "string" &&
    VALID_ACTION_TYPES.has(candidate.type as RoomActionType) &&
    typeof candidate.roomCode === "string" &&
    typeof candidate.playerId === "string" &&
    typeof candidate.sentAt === "number" &&
    "payload" in candidate &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
}

export function encodeMessage(message: RoomActionMessage): string {
  return JSON.stringify(message);
}

export function decodeMessage(raw: string): RoomActionMessage | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRoomActionMessage(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
