# ITSLAM - Web App Scaffold

Skeleton web app for the chaotic 4-player sheep card game "ITSLAM" built with SvelteKit.

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── cards/
│   │   │   ├── Card.svelte          # Individual card component
│   │   │   └── Sheep.svelte         # Sheep (2-part card) component
│   │   ├── game/
│   │   │   ├── PlayerField.svelte   # Player's sheep field display
│   │   │   ├── PlayerHand.svelte    # Player's hand of cards
│   │   │   ├── GameBoard.svelte     # Main board with player positions
│   │   │   ├── ActionPanel.svelte   # Turn actions (play, draw, end turn)
│   │   │   └── GameLog.svelte       # Game event log
│   │   └── modals/
│   │       ├── LobbyModal.svelte    # Game setup / player selection
│   │       ├── CoinFlipModal.svelte # Chaos card coin flip UI
│   │       └── GameOverModal.svelte # Final scores & winner
│   ├── gamestore.ts                 # Game engine logic (skeleton)
│   ├── stores.ts                    # Svelte stores (game state, UI state)
│   ├── types.ts                     # TypeScript types
│   ├── utils/
│   │   ├── gameHelpers.ts           # Game utility functions
│   │   └── colorUtils.ts            # Color/styling utilities
│   └── assets/
├── routes/
│   ├── +layout.svelte               # App layout wrapper
│   └── +page.svelte                 # Main game page
├── styles/
│   └── global.css                   # Global styles & utilities
```

## Key Features Scaffolded

### Game Engine (`gamestore.ts`)

- Card deck creation
- Player initialization
- Sheep validation logic
- Turn management (start/end turn)
- Card playing mechanics
- Action card handlers (Yoink, Wheat, Wolf, Re-flip)
- Chaos card handlers with coin-flip logic
- Body swapping mechanics
- Scoring system

**Status**: Skeleton with function signatures and pseudocode guidance

### UI Components

#### Cards

- **Card.svelte**: Displays individual cards with type-specific styling
- **Sheep.svelte**: Shows 2-part sheep with modifiers

#### Game

- **PlayerField.svelte**: Displays player's field of sheep
- **PlayerHand.svelte**: Shows current player's hand (scrollable)
- **GameBoard.svelte**: Main board layout with player positions
- **ActionPanel.svelte**: Current player's action buttons
- **GameLog.svelte**: Event log with timestamps

#### Modals

- **LobbyModal.svelte**: Game setup (2-4 players, name entry)
- **CoinFlipModal.svelte**: Chaos card prediction & flip animation
- **GameOverModal.svelte**: Scores and winner announcement

### State Management (`stores.ts`)

- `gameState`: Current game state (players, piles, turn)
- `uiState`: UI state (modals, selections, logs)
- `playerNames`: Player names for the current game
- `currentPlayerid`: Current player's ID for perspective
- `gameOverState`: Final scores and winners

### Styling

- Responsive grid layout (2-4 player configurations)
- Mobile-friendly design
- Color-coded cards and components
- Utility CSS classes

## TODO - What Needs Implementation

### Game Engine

- [ ] Implement all TODO functions in `gamestore.ts`
- [ ] Connect game logic to Svelte stores
- [ ] Handle keyboard shortcuts (D=Draw, P=Play, E=End Turn)

### UI Logic

- [ ] Card selection and multi-card plays
- [ ] Sheep target selection
- [ ] Player field interaction
- [ ] Coin flip modal state management
- [ ] Game log message generation

### Features

- [ ] Multiplayer sync (local pass-n-play or websockets)
- [ ] Card animation/transitions
- [ ] Sound effects
- [ ] Undo functionality
- [ ] Settings/rules display

### Styling

- [ ] Finish card styling with colors
- [ ] Animation for coin flips
- [ ] Sheep visual feedback
- [ ] Mobile optimization

### Testing

- [ ] Game flow testing
- [ ] Edge case handling
- [ ] UI responsiveness

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build
npm run build

# Lint/Check
npm run check
```

## Game Rules Reminder

- **Setup**: 2-4 players, 5 cards each
- **Turn**: Draw (min 3 cards), Play cards freely, Discard down to 7
- **Sheep**: Head + Butt same color = valid (unless modified)
- **Modifiers**: Paint (color ignore), Franken (2 same parts)
- **Franken Protection**: Double-butt blocks Wheat, Double-head blocks Wolf
- **Actions**: Yoink (steal 2 cards), Wheat (steal sheep), Wolf (discard sheep), Re-flip (reroll)
- **Chaos**: Coin-flip cards with major effects
- **Scoring**: +1 per sheep, +2 per rainbow sheep, -3 per Chaos card in hand
- **End**: When draw pile empties, everyone gets one final turn
- **Victory**: Most points wins!

---

See `DESCRIPTION.md` for full game rules.
