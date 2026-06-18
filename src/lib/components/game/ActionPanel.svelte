<script lang="ts">
  // src/lib/components/game/ActionPanel.svelte
  let {
    isCurrentPlayerTurn = false,
    hasPlayedCard = false,
    onPlayCard = null,
    onEndTurn = null,
    onDrawCard = null,
  } = $props<{
    isCurrentPlayerTurn?: boolean;
    hasPlayedCard?: boolean;
    onPlayCard?: (() => void) | null;
    onEndTurn?: (() => void) | null;
    onDrawCard?: (() => void) | null;
  }>();

  // TODO: Show available actions based on game state
  // TODO: Enable/disable buttons based on turn and card selection
  // TODO: Show keyboard shortcuts
</script>

<div class="action-panel">
  <div class="action-title">Actions</div>

  {#if !isCurrentPlayerTurn}
    <div class="waiting-text">Waiting for current player...</div>
  {:else}
    <div class="action-buttons">
      <!-- TODO: Draw Card button -->
      <button
        class="action-btn draw-btn"
        on:click={() => onDrawCard?.()}
        disabled={hasPlayedCard}
        title="Draw a card (D)"
      >
        🎴 Draw
      </button>

      <!-- TODO: Play Card button (contextual) -->
      <button
        class="action-btn play-btn"
        on:click={() => onPlayCard?.()}
        disabled={!hasPlayedCard}
        title="Play selected card (P)"
      >
        ▶ Play
      </button>

      <!-- TODO: End Turn button -->
      <button
        class="action-btn end-turn-btn"
        on:click={() => onEndTurn?.()}
        title="End your turn (E) - Don't forget to baa! 🐑"
      >
        🐑 End Turn
      </button>
    </div>

    <!-- TODO: Game rules reminder in collapsible section -->
    <div class="action-info">
      <small
        >Hand: 3-7 cards | Max 1 Chaos/turn | Can't discard Chaos cards</small
      >
    </div>
  {/if}
</div>

<style>
  .action-panel {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background: #fafafa;
  }

  .action-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 12px;
  }

  .waiting-text {
    color: #6b7280;
    font-size: 14px;
    text-align: center;
    padding: 12px;
  }

  .action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }

  .action-btn {
    padding: 10px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }

  .action-btn:hover:not(:disabled) {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .end-turn-btn {
    grid-column: 1 / -1;
    background: #10b981;
    color: white;
    border-color: #10b981;
  }

  .end-turn-btn:hover:not(:disabled) {
    background: #059669;
  }

  .action-info {
    font-size: 12px;
    color: #6b7280;
    text-align: center;
    padding: 8px;
    background: #f3f4f6;
    border-radius: 4px;
  }
</style>
