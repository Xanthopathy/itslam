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

### Phase 1: Core Game Engine [DONE]

- [x] **Deck & Setup** ([src/lib/game/deck.ts](src/lib/game/deck.ts)): Creation and shuffling logic.
- [x] **Sheep Logic** ([src/lib/game/sheep.ts](src/lib/game/sheep.ts)): Validity, modifiers, value calculation.
- [x] **Action Cards** ([src/lib/game/actions.ts](src/lib/game/actions.ts)): Handlers for Yoink, Wheat, Wolf, and Franken checks.
- [x] **ITSLAM! Mechanic** ([src/lib/game/itslam.ts](src/lib/game/itslam.ts)): Full coin-flip lifecycle and effect handlers (Lure/Remove/Yoink/etc).
- [x] **Scoring & Lifecycle** ([src/lib/game/scoring.ts](src/lib/game/scoring.ts)): Game over checks, winner calculation, and final-round handoff timing.
- [x] **Orchestrator** ([src/lib/gameStore.svelte.ts](src/lib/gameStore.svelte.ts)): Svelte `$state` management and public API surface.

### Phase 2: Networking & Multiplayer [IN_PROGRESS]

- [x] **Message Schema** ([src/lib/network/messages.ts](src/lib/network/messages.ts)): JSON action types and encoding/decoding.
- [x] **Topic & URL Logic** ([src/lib/network/topics.ts](src/lib/network/topics.ts)): Room code generation and `?room=` URL parsing.
- [x] **Security/Roles** ([src/lib/network/host.ts](src/lib/network/host.ts)): Gating sensitive actions (INIT, FLIP_RESULT) to host-only.
- [ ] **MQTT Adapter**: Real implementation using HiveMQ/EMQX over WSS. (Temporarily using a stand-in for testing)
- [x] **Action Dispatcher**: Wiring incoming MQTT messages to trigger `gameStore` methods.
- [ ] **Echo Guard** ([src/lib/network/sync.ts](src/lib/network/sync.ts)): Prevent clients from double-applying their own sent actions.
- [ ] **State Recovery**: Implementation of `SYNC_STATE` for late-joiners/refreshers.

### Phase 3: Frontend & Components [DONE]

- [x] **Lobby/Landing**: [LobbyModal.svelte](src/lib/components/modals/LobbyModal.svelte) for Host/Join screen.
- [x] **Shell & Layout**: [+layout.svelte](src/routes/+layout.svelte) and [+page.svelte](src/routes/+page.svelte) root mounting.
- [x] **GameBoard**: [GameBoard.svelte](src/lib/components/game/GameBoard.svelte) main layout.
- [x] **Player Interaction**: [PlayerHand.svelte](src/lib/components/game/PlayerHand.svelte) and [PlayerField.svelte](src/lib/components/game/PlayerField.svelte).
- [x] **Visuals**: [Card.svelte](src/lib/components/cards/Card.svelte) and [Sheep.svelte](src/lib/components/cards/Sheep.svelte) base components.
- [x] **Modals**: [ChaosModal.svelte](src/lib/components/modals/ChaosModal.svelte) (ITSALM) and [GameOverModal.svelte](src/lib/components/modals/GameOverModal.svelte).
- [x] **Game Log**: [GameLog.svelte](src/lib/components/game/GameLog.svelte) reactive display.
- [x] **Styles**: [global.css](src/styles/global.css) (Tailwind) and [colorUtils.ts](src/lib/utils/colorUtils.ts) theming.

### Phase 4: Integration & Polish [IN_PROGRESS]

- [x] **Auto-Join Flow**: Wire room-code-from-URL into the mount lifecycle.
- [ ] **Host Presence**: Handling "Game Frozen" states if the host disconnects.
- [ ] **Game Helpers**: [gameHelper.ts](src/lib/utils/gameHelper.ts) and [keyboard.ts](src/lib/utils/keyboard.ts) for UX shortcuts.
- [ ] **Visual Feedback**: Card animations, state transitions, and styling refinements.

### Notes for a fresh chat picking this up

- Import convention: relative imports (`./`, `../`) within `src/lib`; use `$lib/...` only from outside `src/lib` (components/routes).
- `types.ts` and `gamestore.svelte.ts` intentionally stay at `src/lib/` (not under `game/`) — they're the public surface; `game/*` is internal, only imported by `gamestore.svelte.ts`.
- Author has limited familiarity with the codebase/TypeScript generally — prefer explaining _why_, not just handing over code, and flag design decisions rather than assuming silently.

## Issue Backlog

This section tracks execution issues without changing the main phase roadmap above.

### Triage Rules

- **Severity**: blocker, high, medium, low
- **Area**: networking, game-logic, ux, visuals, polish
- **Status**: todo, in-progress, blocked, done

### Prioritized Queue

1. NET-001
2. NET-002
3. LOGIC-001
4. LOGIC-002
5. UX-001
6. UX-002
7. UX-003
8. UX-004
9. UI-001
10. UI-002
11. UI-003
12. UI-004
13. UI-005
14. UI-006
15. VIS-001
16. POLISH-001

### Issue Cards

#### NET-001 - Rejoin on refresh

- **Area**: networking
- **Severity**: high
- **Status**: todo
- **Problem**: host and non-host refresh should attempt to rejoin the ongoing game (non-host retain their last entered game in enter name field if not currently in a game, and rejoins the game with their existing game name if currently in a game)

#### NET-002 - Recurring MQTT reconnect error

- **Area**: networking
- **Severity**: high
- **Status**: todo
- **Problem**: this error randomly started popping up every second in console without touching anything for both players after playing a couple turns (npm run dev doesn't report anything):

```
  mqtt.esm.js:8
  WebSocket connection to 'wss://broker.hivemq.com:8884/mqtt' failed:
  sT @ mqtt.esm.js:8
  (anonymous) @ mqtt.esm.js:8
  r @ mqtt.esm.js:8
  connect @ mqtt.esm.js:3
  \_reconnect @ mqtt.esm.js:3
  (anonymous) @ mqtt.esm.js:3
```

#### LOGIC-001 - Discard limit off by one

- **Area**: game-logic
- **Severity**: high
- **Status**: todo
- **Problem**: discard logic off by one, player discards 1 too many and can stay at 7 max instead of 6

#### LOGIC-002 - Card not found after play

- **Area**: game-logic
- **Severity**: high
- **Status**: todo
- **Problem**: playing cards successfully gives this error: `utils.ts:54 Card butt-41c98a85-5df2-45d1-8338-a182c3f647d6 not found in player ec9ac264-342d-40f7-88e7-ca4f4a84cc2a's hand.` (happens to action/modifier/part/itslam/etc cards, whether the player played 1 or multiple cards at once)

#### UX-001 - Turn loop clarity in logs

- **Area**: ux
- **Severity**: medium
- **Status**: todo
- **Problem**: Logs should clarify rounds whenever all players finish their turn for one loop

#### UX-002 - Non-active hand should be dim/disabled

- **Area**: ux
- **Severity**: medium
- **Status**: todo
- **Problem**: better display cards by disabling + dim hand when it's not your turn

#### UX-003 - Re-flip interaction and messaging

- **Area**: ux
- **Severity**: medium
- **Status**: todo
- **Problem**: add play re-flip button during itslam grace period, have it be disabled unless the player has the card in their hand (flip result message should clarify better whether the guesser got it right or wrong)

#### UX-004 - Selection compatibility rules

- **Area**: ux
- **Severity**: medium
- **Status**: todo
- **Problem**: prevent multiple non-compatible selection: If you first select an action card, selecting any other card will deselect the first action card, same rule applies if any newly selected card has no situation where they can be played together. More lax on head/butt/modifier cards though as the player can select the 2-3 cards to form a sheep at any point in the sequence.

#### UI-001 - Temporary card icons

- **Area**: visuals
- **Severity**: medium
- **Status**: todo
- **Problem**: add basic temporary card icons (head, butt, paint, wolf, etc) in place of "black Butt", "rainbow Head" (they should be centered to have good margins between top text and bottom text on the card)

#### UI-002 - Center text on field cards

- **Area**: visuals
- **Severity**: low
- **Status**: todo
- **Problem**: center card text on the field (the cards that became sheep) too (currently only cards in hand are centered)

#### UI-003 - True rainbow styling

- **Area**: visuals
- **Severity**: low
- **Status**: todo
- **Problem**: rainbow is not actually rainbow (currently only shows red orange yellow pink purple)

#### UI-004 - Sheep visual separation

- **Area**: visuals
- **Severity**: low
- **Status**: todo
- **Problem**: each sheep should be better segregated with some clear border for each sheep

#### UI-005 - Grammar fix

- **Area**: ux
- **Severity**: low
- **Status**: todo
- **Problem**: "You's Field" is wrong and should be "Your Field"

#### UI-006 - Player representation

- **Area**: visuals
- **Severity**: medium
- **Status**: todo
- **Problem**: better player representation (icon, 4-quadrant splitting with each player having their hand size shown)

#### VIS-001 - Card movement animations

- **Area**: polish
- **Severity**: low
- **Status**: todo
- **Problem**: card animation: moving across the board, moving between player hands, moving between draw and discard piles

#### POLISH-001 - Graphics museum

- **Area**: visuals
- **Severity**: low
- **Status**: todo
- **Problem**: Make a museum for reviewing graphics

### Completed Log

- _Empty for now; move finished issue cards here with date and commit reference._
