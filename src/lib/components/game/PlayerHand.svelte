<script lang="ts">
  // src/lib/components/game/PlayerHand.svelte
  import type { Card as CardType } from "$lib/types";
  import CardComponent from "../cards/Card.svelte";

  let {
    cards = [],
    selectedCardIds = [],
    playerName = "Player",
    clickable = true,
    onCardClick = null,
  } = $props<{
    cards?: CardType[];
    selectedCardIds?: string[];
    playerName?: string;
    clickable?: boolean;
    onCardClick?: ((cardId: string) => void) | null;
  }>();

  const handleCardClick = (cardId: string) => {
    onCardClick?.(cardId);
  };
</script>

<div class="player-hand">
  <div class="hand-header">
    <h3>{playerName}'s Hand</h3>
    <span class="card-count">{cards.length}</span>
  </div>

  <!-- TODO: Implement card scrolling/carousel for small screens -->
  <div class="hand-cards">
    {#each cards as card (card.id)}
      <CardComponent
        {card}
        selected={selectedCardIds.includes(card.id)}
        {clickable}
        onClick={() => handleCardClick(card.id)}
      />
    {/each}
  </div>
</div>

<style>
  .player-hand {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px;
    background: #fafafa;
  }

  .hand-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 8px;
  }

  .hand-header h3 {
    margin: 0;
    font-size: 16px;
  }

  .card-count {
    background: #4f46e5;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  }

  .hand-cards {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 8px 0;
  }

  .hand-cards::-webkit-scrollbar {
    height: 6px;
  }

  .hand-cards::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
</style>
