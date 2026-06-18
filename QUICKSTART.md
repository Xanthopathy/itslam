# ITSLAM Quick Start

## Setup

```bash
# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev
```

Visit http://localhost:5173 (or the URL shown in terminal)

## What You'll See

1. **Lobby Modal**:
   - Select 2-4 players
   - Enter player names
   - Click "Start Game"

2. **Game Board** (when implemented):
   - Player fields with sheep
   - Draw/discard piles in center
   - Current player's hand at bottom
   - Action panel on the right
   - Game log

## Current State

✅ **UI is built** - All components render correctly with styling
✅ **Game engine skeleton** - All function signatures defined
❌ **Game logic** - Not implemented yet (waiting for you!)

## What to Do Next

1. Open `src/lib/gamestore.ts`
2. Find functions with `// TODO: Implement` comments
3. Implement them following the pseudocode guidance
4. Wire components to game functions in `src/routes/+page.svelte`
5. Test turn flow first

## Helpful Files

- **SCAFFOLD.md** - Project structure overview
- **DEVELOPMENT.md** - Detailed dev guide with roadmap
- **src/lib/gamestore.ts** - Game engine with 40+ function stubs
- **src/lib/types.ts** - Type definitions
- **src/lib/stores.ts** - Svelte stores setup

## Terminal Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run check    # TypeScript/linting check
npm run preview  # Preview build locally
```

## Keyboard Shortcuts (To Implement)

- **D** - Draw card
- **P** - Play card
- **E** - End turn
- **?** - Show help

## Need Help?

- Check `DEVELOPMENT.md` for implementation roadmap
- See pseudocode comments in `gamestore.ts`
- Look at component props in `*.svelte` files
- Review types in `types.ts`

---

Now go build! 🐑

P.S. Remember the game rule: players must baa like a sheep when ending their turn! 🐑🐑🐑
