<script lang="ts">
  // src/lib/components/game/PlayerField.svelte
  import type { Sheep, Player } from "$lib/types";
  import SheepComponent from "../cards/Sheep.svelte";

  let {
    player,
    isCurrentPlayer = false,
    selectedSheepIndex = -1,
    onSheepClick = null,
  } = $props<{
    player: Player;
    isCurrentPlayer?: boolean;
    selectedSheepIndex?: number;
    onSheepClick?: ((index: number) => void) | null;
  }>();

  // TODO: Show turn indicator
  // TODO: Show player status (hand size, score if visible)
</script>

<div class={`player-field ${isCurrentPlayer ? "current-player" : ""}`}>
  <div class="field-header">
    <h2 class="player-name">{player.name}</h2>
    {#if isCurrentPlayer}
      <span class="turn-badge">YOUR TURN</span>
    {/if}
    <div class="player-stats">
      <span class="stat">🎴 {player.hand.length}</span>
    </div>
  </div>

  <!-- TODO: Field display for incomplete & complete sheep -->
  <div class="field-area">
    {#if player.field.length === 0}
      <div class="empty-field">No sheep yet...</div>
    {:else}
      <div class="field-sheep">
        {#each player.field as sheep, index (index)}
          <SheepComponent
            {sheep}
            selected={selectedSheepIndex === index}
            clickable={true}
            onClick={() => onSheepClick?.(index)}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .player-field {
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    background: #f9fafb;
    transition: all 0.2s;
  }

  .player-field.current-player {
    border-color: #4f46e5;
    background: #f0f4ff;
    box-shadow: 0 0 0 1px #4f46e5;
  }

  .field-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #d1d5db;
  }

  .player-name {
    margin: 0;
    font-size: 18px;
  }

  .turn-badge {
    background: #10b981;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
  }

  .player-stats {
    margin-left: auto;
    display: flex;
    gap: 12px;
    font-size: 14px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .field-area {
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-field {
    color: #9ca3af;
    font-size: 14px;
  }

  .field-sheep {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
</style>
