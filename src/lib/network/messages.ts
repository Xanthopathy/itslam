export type RoomActionType =
  | "INIT_GAME"
  | "PLAY_CARDS"
  | "END_TURN"
  | "SUBMIT_PREDICTION"
  | "SUBMIT_FLIP_RESULT"
  | "RESOLVE_ITSLAM"
  | "SYNC_STATE";

export type RoomActionMessage<TPayload = unknown> = {
  type: RoomActionType;
  roomCode: string;
  playerId: string;
  sentAt: number;
  payload: TPayload;
};

export function isRoomActionMessage(
  value: unknown,
): value is RoomActionMessage {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<RoomActionMessage>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.roomCode === "string" &&
    typeof candidate.playerId === "string" &&
    typeof candidate.sentAt === "number" &&
    "payload" in candidate
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
