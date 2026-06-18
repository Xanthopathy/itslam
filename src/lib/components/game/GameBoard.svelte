<script lang="ts">
  // src/lib/components/game/GameBoard.svelte
  import type { GameState, Player } from "$lib/types";
  import PlayerField from "./PlayerField.svelte";

  let {
    gameState,
    currentPlayerId,
    selectedSheepIndex = -1,
    onPlayerFieldClick = null,
  } = $props<{
    gameState: GameState;
    currentPlayerId: string;
    selectedSheepIndex?: number;
    onPlayerFieldClick?:
      | ((playerId: string, sheepIndex: number) => void)
      | null;
  }>();

  // TODO: Layout arrangement - 2-4 players in circle
  // TODO: Responsive grid for different player counts
</script>

<div class="game-board">
  <!-- TODO: Center table area for action log, draw pile, discard pile -->
  <div class="board-center">
    <div class="pile-info">
      <div class="draw-pile">
        <div class="pile-count">{gameState.drawPile.length}</div>
        <div class="pile-label">Draw Pile</div>
      </div>
      <div class="discard-pile">
        <div class="pile-count">{gameState.discardPile.length}</div>
        <div class="pile-label">Discard</div>
      </div>
    </div>
  </div>

  <!-- TODO: Player positions based on count (2-4 players) -->
  <div class="players-container">
    {#each gameState.players as player, index (player.id)}
      <div
        class="player-position"
        data-position={index}
        data-total={gameState.players.length}
      >
        <PlayerField
          {player}
          isCurrentPlayer={player.id === currentPlayerId}
          {selectedSheepIndex}
          onSheepClick={(sheepIndex) =>
            onPlayerFieldClick?.(player.id, sheepIndex)}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .game-board {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: auto 1fr;
    gap: 24px;
    padding: 20px;
    min-height: 100vh;
  }

  .board-center {
    grid-column: 2;
    grid-row: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
  }

  .pile-info {
    display: flex;
    gap: 24px;
  }

  .draw-pile,
  .discard-pile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .pile-count {
    font-size: 24px;
    font-weight: bold;
    color: #4f46e5;
  }

  .pile-label {
    font-size: 12px;
    color: #6b7280;
  }

  .players-container {
    grid-column: 1 / -1;
    grid-row: 2;
    display: grid;
    gap: 20px;
  }

  /* 2-player layout */
  :global([data-total="2"]) {
    grid-template-columns: 1fr 1fr;
  }

  /* 3-player layout */
  :global([data-total="3"]) {
    grid-template-columns: 1fr auto 1fr;
  }

  /* 4-player layout */
  :global([data-total="4"]) {
    grid-template-columns: 1fr 1fr;
  }
</style>
