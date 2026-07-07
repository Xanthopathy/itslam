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

## Technical Challenges

- **State Recovery**: Since there's no backend, if a player refreshes or joins late, they won't know the current state.
  - _Strategy_: When a new player joins (`CLIENT_JOINED`), the Host should rebroadcast the full current state via a `SYNC_STATE` message (see Phase 2).
- **Host Dependencies**: The game relies on the Host to finalize coin flips and initiate the deck.
  - _Strategy_: If the Host disconnects, the game should "freeze" with a message until they return or a new host is elected (though election is complex for this scope).

## Implementation Roadmap

### Phase 1: Core Game Engine 🟢

- [x] **Deck & Setup** ([src/lib/game/deck.ts](src/lib/game/deck.ts)): Creation and shuffling logic.
- [x] **Sheep Logic** ([src/lib/game/sheep.ts](src/lib/game/sheep.ts)): Validity, modifiers, value calculation.
- [x] **Action Cards** ([src/lib/game/actions.ts](src/lib/game/actions.ts)): Handlers for Yoink, Wheat, Wolf, and Franken checks.
- [x] **ITSLAM! Mechanic** ([src/lib/game/itslam.ts](src/lib/game/itslam.ts)): Full coin-flip lifecycle and effect handlers (Lure/Remove/Yoink/etc).
- [x] **Scoring & Lifecycle** ([src/lib/game/scoring.ts](src/lib/game/scoring.ts)): Game over checks and winner calculation.
- [x] **Orchestrator** ([src/lib/gameStore.ts](src/lib/gameStore.ts)): Svelte `$state` management and public API surface.

### Phase 2: Networking & Multiplayer 🟡

- [x] **Message Schema** ([src/lib/network/messages.ts](src/lib/network/messages.ts)): JSON action types and encoding/decoding.
- [x] **Topic & URL Logic** ([src/lib/network/topics.ts](src/lib/network/topics.ts)): Room code generation and `?room=` URL parsing.
- [x] **Security/Roles** ([src/lib/network/host.ts](src/lib/network/host.ts)): Gating sensitive actions (INIT, FLIP_RESULT) to host-only.
- [ ] **MQTT Adapter**: Real implementation using HiveMQ/EMQX over WSS.
- [ ] **Action Dispatcher**: Wiring incoming MQTT messages to trigger `gameStore` methods.
- [ ] **Echo Guard** ([src/lib/network/sync.ts](src/lib/network/sync.ts)): Prevent clients from double-applying their own sent actions.
- [ ] **State Recovery**: Implementation of `SYNC_STATE` for late-joiners/refreshers.

### Phase 3: Frontend & Components 🔴

- [ ] **Lobby/Landing**: [LobbyModal.svelte](src/lib/components/modals/LobbyModal.svelte) for Host/Join screen.
- [ ] **GameBoard**: [GameBoard.svelte](src/lib/components/game/GameBoard.svelte) main layout.
- [ ] **Player Interaction**: [PlayerHand.svelte](src/lib/components/game/PlayerHand.svelte) and [PlayerField.svelte](src/lib/components/game/PlayerField.svelte).
- [ ] **Visuals**: [Card.svelte](src/lib/components/cards/Card.svelte) and [Sheep.svelte](src/lib/components/cards/Sheep.svelte) base components.
- [ ] **Modals**: [ChaosModal.svelte](src/lib/components/modals/ChaosModal.svelte) (ITSALM) and [GameOverModal.svelte](src/lib/components/modals/GameOverModal.svelte).
- [ ] **Game Log**: [GameLog.svelte](src/lib/components/game/GameLog.svelte) reactive display.
- [ ] **Styles**: [global.css](src/styles/global.css) and [colorUtils.ts](src/lib/utils/colorUtils.ts) theming.

### Phase 4: Integration & Polish ⚪

- [ ] **Auto-Join Flow**: Wire room-code-from-URL into the mount lifecycle.
- [ ] **Host Presence**: Handling "Game Frozen" states if the host disconnects.
- [ ] **Game Helpers**: [gameHelper.ts](src/lib/utils/gameHelper.ts) and [keyboard.ts](src/lib/utils/keyboard.ts) for UX shortcuts.
- [ ] **Visual Feedback**: Card animations, state transitions, and styling refinements.

### Notes for a fresh chat picking this up

- Import convention: relative imports (`./`, `../`) within `src/lib`; use `$lib/...` only from outside `src/lib` (components/routes).
- `types.ts` and `gamestore.ts` intentionally stay at `src/lib/` (not under `game/`) — they're the public surface; `game/*` is internal, only imported by `gamestore.ts`.
- Author has limited familiarity with the codebase/TypeScript generally — prefer explaining _why_, not just handing over code, and flag design decisions rather than assuming silently.
