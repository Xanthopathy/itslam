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

### Room Joining via Shareable Link

- To keep the experience familiar (click a link, you're in), the room code is reflected in the URL's query string rather than requiring manual entry.

- How it works:
  1. Host clicks "Host Game" → generates room code SHEEP-1234 and updates the browser URL to https://<your-domain>/?room=SHEEP-1234 (no page reload, just history.pushState). (ex: https://yourgithubpage.io/?room=SHEEP-4821)
  2. Host shares that URL like any normal link (Discord, text, etc).
  3. When any client loads the page, it checks for a ?room= query param on mount. If present, it skips the "host/join" landing screen and auto-connects directly: subscribes to the MQTT topic itslam/rooms/SHEEP-1234 and prompts only for a player name before joining.
  4. If no ?room= param is present, the normal landing screen shows ("Host Game" / "Join Game with code").

Note: the URL param is purely a convenience wrapper around the existing MQTT join flow — there's no server behind the link, the page just reads the param client-side and auto-fills the room code field before connecting to the broker as usual.
