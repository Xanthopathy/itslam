// src/lib/network/host.ts
import type { RoomActionType } from "./messages";

export function isHostOnlyAction(actionType: RoomActionType): boolean {
  return (
    actionType === "INIT_GAME" ||
    actionType === "SUBMIT_FLIP_RESULT" ||
    actionType === "FINALIZE_COIN_FLIP"
  );
}

export function canPublishAction(
  actionType: RoomActionType,
  isHost: boolean,
): boolean {
  if (!isHostOnlyAction(actionType)) return true;
  return isHost;
}
