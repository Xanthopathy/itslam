import type { RoomActionMessage } from "./messages";

export function isHostOnlyAction(
  actionType: RoomActionMessage["type"],
): boolean {
  return actionType === "INIT_GAME" || actionType === "SUBMIT_FLIP_RESULT";
}

export function canPublishAction(
  actionType: RoomActionMessage["type"],
  isHost: boolean,
): boolean {
  if (!isHostOnlyAction(actionType)) return true;
  return isHost;
}
