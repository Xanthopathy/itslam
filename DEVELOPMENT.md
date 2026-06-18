# ITSLAM Development Guide

Complete scaffolding for a 4-player multiplayer card game web app. All components, types, and game engine stubs are in place. Ready for implementation.

## Project State

✅ **Completed**:

- TypeScript configuration fixed (added @types/node)
- Game engine skeleton with 40+ function stubs (all signatures correct)
- Svelte stores for centralized state management
- 11 UI components (cards, game board, modals, action panels)
- Global styling with responsive layouts
- Utility helpers (game logic, colors, keyboard shortcuts)
- Type definitions for all game entities

🔶 **In Progress**:

- Game engine implementation (function bodies)
- Component event handler wiring
- Store integration with game logic

⚠️ **Not Started**:

- Multiplayer synchronization
- Sound effects & animations
- Settings UI
- Advanced features

## Component Hierarchy

```
+page.svelte (Main page - routes/+page.svelte)
├── LobbyModal (Show during setup)
└── GameContainer (After game starts)
    ├── GameBoard
    │   ├── PlayerField (x2-4)
    │   │   └── Sheep (x6 max per player)
    │   ├── DrawPile / DiscardPile (center)
    │   └── GameLog
    ├── PlayerHand
    │   └── Card (x1-7 in hand)
    ├── ActionPanel (Draw, Play, End Turn)
    ├── CoinFlipModal (During chaos cards)
    └── GameOverModal (Final scores)
```

## Game Flow

```
1. LobbyModal: Player count + names
   ↓
2. Initialize game with GameEngine.initGame()
   ↓
3. GameBoard: Show all players' fields
   ↓
4. ActionPanel: Current player draws/plays/ends turn
   ↓
5. For each card play:
   - Card selection in PlayerHand
   - Target selection (if needed)
   - Execute playCard()
   ↓
6. For chaos cards:
   - Show CoinFlipModal
   - Get prediction from player
   - Flip coin (50/50)
   - Apply effect
   ↓
7. Check isGameOver() → If true, show GameOverModal
   ↓
8. Repeat from step 4 until game ends
```

## Store Structure

### `gameState` (Core game state)

```typescript
{
  players: Player[],           // All players
  drawPile: Card[],           // Remaining cards to draw
  discardPile: Card[],        // Discarded cards
  currentTurnPlayerId: string,// Whose turn it is
  roundNumber: number,        // Current round
  gameStarted: boolean,
  finalRound: boolean,        // True when draw pile empties
}
```

### `uiState` (UI-only state)

```typescript
{
  gameStarted: boolean,
  playerCount: number,
  selectedCards: string[],    // IDs of selected cards
  selectedTargetPlayerId?: string,
  showCoinFlipModal: boolean,
  coinFlipCard?: Card,
  gameLog: LogMessage[],
}
```

### `currentPlayerid` (Current player's perspective)

Used to determine which hand/field to display from player's view

### `gameOverState` (Final state)

```typescript
{
  isGameOver: boolean,
  winners: Player[],
  scores: Record<string, number>,
}
```

## Implementation Roadmap

### Phase 1: Core Turn Flow (PRIORITY)

1. Implement `startTurn()` - Draw until hand has 3+ cards
2. Implement `playCard()` - Route to handlers
3. Implement `endTurn()` - Discard to 7, advance player
4. Wire ActionPanel buttons to these functions
5. Test: Play 1 full turn for each player

### Phase 2: Card Mechanics

1. Implement `playBodyCard()` - Add sheep to field
2. Implement `playActionCard()` - Route Yoink/Wheat/Wolf/Re-flip
3. Implement `swapSheepPart()` - Body swapping with validation
4. Test: Play all card types

### Phase 3: Action Effects

1. Implement `handleYoink()` - Steal 2 cards
2. Implement `handleWheat()` - Steal up to 2 sheep
3. Implement `handleWolf()` - Remove 1 sheep
4. Implement `handleReFlip()` - Flip card face (if needed)
5. Test: All action effects work correctly

### Phase 4: Chaos Cards

1. Implement `playChaosCard()` - Show modal, get prediction
2. Implement all 5 chaos handlers:
   - `handleLure2Sheep()`
   - `handleRemove2Sheep()`
   - `handleYoinkEntireHand()`
   - `handleHalve2Sheep()`
   - `handleRecover1Sheep()`
3. Integrate CoinFlipModal state management
4. Test: Chaos cards trigger correctly

### Phase 5: Game End Logic

1. Implement `isGameOver()` - Check if draw pile empty
2. Implement `getGameScore()` - Calculate with penalties
3. Implement `getWinner()` - Find player(s) with highest score
4. Wire to GameOverModal
5. Test: Game ends and scores display correctly

### Phase 6: Polish

1. Add card animations
2. Implement keyboard shortcuts
3. Add sound effects
4. Mobile UI refinements

## File Locations for Implementation

### Core Logic (in `src/lib/gamestore.ts`)

- `initGame(playerNames: string[])`
- `startTurn(playerId: string)`
- `drawCard(playerId: string): Card`
- `playCard(playerId: string, cardId: string, targetPlayerId?: string)`
- `endTurn(playerId: string)`
- All action handlers and card type handlers

### Components Using Game Logic

- **ActionPanel.svelte**: Calls `startTurn()`, `drawCard()`, `endTurn()`
- **PlayerHand.svelte**: Selects cards for play
- **PlayerField.svelte**: Shows sheep results
- **CoinFlipModal.svelte**: Prediction logic for chaos cards
- **GameOverModal.svelte**: Displays final scores from `getGameScore()`, `getWinner()`

### Store Updates

Most game functions should update stores:

```typescript
gameState.update((state) => ({ ...state /* updates */ }));
uiState.update((state) => ({ ...state /* UI updates */ }));
```

## Testing Checklist

- [ ] Game initializes with 2-4 players
- [ ] Each player can draw cards
- [ ] Can play head/butt cards and form valid sheep
- [ ] Action cards trigger effects correctly
- [ ] Chaos cards show coin-flip modal
- [ ] Game ends when draw pile empties
- [ ] Final scores calculated correctly
- [ ] Winner determined properly
- [ ] Mobile layout responsive
- [ ] No console errors

## Quick Reference: Function Signatures

See `src/lib/gamestore.ts` for all function stubs with pseudocode guidance.

Key ones:

```typescript
// Setup
initGame(playerNames: string[]): void

// Turn management
startTurn(playerId: string): void
drawCard(playerId: string): Card
playCard(playerId: string, cardId: string, targetPlayerId?: string): void
endTurn(playerId: string): void

// Card logic
playBodyCard(playerId: string, card: Card, targetPlayerId?: string): void
playActionCard(playerId: string, card: Card, targetPlayerId?: string): void
playChaosCard(playerId: string, card: Card, targetPlayerId?: string): void

// Utility
getPlayerField(playerId: string): Sheep[]
getPlayerHand(playerId: string): Card[]
isGameOver(): boolean
getGameScore(): Record<string, number>
getWinner(): Player[]
```

## Tips for Development

1. **Start with Turn Flow**: Get `startTurn()` → `drawCard()` → `endTurn()` working first. This is the backbone of the game.

2. **Use Console.log**: Add debug logs to understand game state flow.

3. **Test Edge Cases**: Empty draw pile, last card, full hand (7 cards), etc.

4. **Keep Stores Updated**: Every meaningful game action should update the stores so components re-render.

5. **Component Events**: Components have `on:` callbacks you can wire to game functions:
   - `onDraw`, `onPlay`, `onEndTurn` from ActionPanel
   - `onClick` from PlayerField to select sheep
   - `onStart` from LobbyModal to initialize game

6. **Type Safety**: Use TypeScript types (`Player`, `Card`, `Sheep`, etc.) everywhere to catch bugs early.

7. **Game Log**: Use `addGameLog()` helper to show events to players.

## Notes

- All components have TypeScript props and event callbacks defined
- Game engine stubs have pseudocode guidance for implementation
- Svelte reactivity is automatic via stores
- CSS is pre-built with responsive grids
- No external game logic dependencies needed

---

**Good luck with ITSLAM! 🐑**

Next: Pick a function from Phase 1 and implement it. Start with `initGame()` and `startTurn()`.
