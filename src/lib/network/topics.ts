export const ROOM_TOPIC_PREFIX = "itslam/rooms";

export function buildRoomTopic(roomCode: string): string {
  return `${ROOM_TOPIC_PREFIX}/${roomCode}`;
}

export function sanitizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export function parseRoomCodeFromUrl(url: URL): string | undefined {
  const roomCode = url.searchParams.get("room");
  if (!roomCode) return undefined;

  const sanitized = sanitizeRoomCode(roomCode);
  return sanitized.length > 0 ? sanitized : undefined;
}

export function createRoomCode(seed = Math.random()): string {
  const suffix = Math.floor(seed * 10000)
    .toString()
    .padStart(4, "0");
  return `SHEEP-${suffix}`;
}
