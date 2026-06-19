## Project Scope

This project is meant to be a simple web app clone of Zedaph's Is That Sheep Looking At Me card game, to be hosted on github for a small group of 4 players and doesn't require infrastructure for more than that. (Still requires minimum multiplayer online stuff)

## Multiplayer

### Public MQTT over Secure WebSockets

- How it works: We use a free, public secure MQTT broker (like HiveMQ or EMQX) over standard WebSockets (wss://broker.hivemq.com:8884/mqtt).

- The Flow:
  1. Host clicks "Host Game" → Generates room code `SHEEP-1234.`
  2. All 4 players subscribe to the MQTT topic itslam/rooms/SHEEP-1234.
  3. When a player performs an action (e.g., plays a card), they publish a small JSON action message (e.g., `{ action: "PLAY_CARD", cardId: "..." }`) to the room.
  4. Every player's client receives the action and runs the exact same state updates locally.

- Pros: Extremely fast (sub-100ms latency), completely free, bypasses firewalls/NATs flawlessly, and requires no registration or API keys from you.
