// src/lib/network/sync.ts
import type { RoomActionMessage } from "./messages";

export type RoomActionHandler = (message: RoomActionMessage) => void;

// TODO: applyIncomingRoomMessage is currently a pass-through and does no
// filtering of its own. Once the MQTT adapter is wired up, this will very
// likely need an "echo guard": MQTT brokers typically deliver a client's own
// published messages back to itself via its subscription, so without a check
// here, a client could end up re-applying its own action a second time.
// A guard should probably look something like:
//
//   if (message.playerId === localPlayerId) return; // already applied locally when we sent it
//
// ...though the exact rule may differ per action type (e.g. SYNC_STATE might
// be fine to reapply, but PLAY_CARDS/END_TURN should only ever be applied
// once). Revisit this once real adapter behavior can be observed —
// guessing at echo semantics in the abstract is more likely to introduce a
// subtle bug than waiting to see the actual message flow.
export function applyIncomingRoomMessage(
  message: RoomActionMessage,
  handler: RoomActionHandler,
): void {
  handler(message);
}
