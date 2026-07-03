import type { RoomActionMessage } from "./messages";

export type RoomActionHandler = (message: RoomActionMessage) => void;

export function applyIncomingRoomMessage(
  message: RoomActionMessage,
  handler: RoomActionHandler,
): void {
  handler(message);
}
