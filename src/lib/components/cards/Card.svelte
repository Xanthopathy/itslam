<script lang="ts">
  // src/lib/components/cards/Card.svelte
  import type { Card as CardType } from "$lib/types";

  let {
    card,
    selected = false,
    clickable = false,
    onClick = null,
  } = $props<{
    card: CardType;
    selected?: boolean;
    clickable?: boolean;
    onClick?: (() => void) | null;
  }>();

  // TODO: Determine card display style based on type
  // - head/butt: show color, shape
  // - action: show action name with icon
  // - modifier: show modifier with effect description
  // - chaos: show special styling
  const getCardClass = () => {
    // TODO: Implement
    return `card card--${card.type}`;
  };

  const getCardColor = () => {
    // TODO: Implement
    return card.color || "#999";
  };
</script>

<div
  class={`${getCardClass()} ${selected ? "selected" : ""} ${clickable ? "clickable" : ""}`}
  on:click={() => onClick?.()}
  role="button"
  tabindex="0"
>
  <!-- TODO: Card content based on type -->
  <div class="card-content">
    {#if card.type === "head" || card.type === "butt"}
      <div class="card-color" style="background-color: {getCardColor()}"></div>
      <div class="card-name">{card.name}</div>
    {:else if card.type === "action"}
      <div class="card-action">
        <div class="action-icon">⚡</div>
        <div class="action-name">{card.name}</div>
      </div>
    {:else if card.type === "modifier"}
      <div class="card-modifier">
        <div class="modifier-icon">✨</div>
        <div class="modifier-name">{card.name}</div>
      </div>
    {:else if card.type === "chaos"}
      <div class="card-chaos">
        <div class="chaos-icon">🎲</div>
        <div class="chaos-name">{card.name}</div>
      </div>
    {/if}
  </div>
</div>

<style>
  .card {
    width: 100px;
    height: 140px;
    border-radius: 8px;
    border: 2px solid #333;
    padding: 8px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 8px;
    cursor: default;
    background: white;
    transition: all 0.2s;
  }

  .card.clickable {
    cursor: pointer;
  }

  .card.clickable:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .card.selected {
    box-shadow: 0 0 0 3px #4f46e5;
  }

  .card-content {
    text-align: center;
    width: 100%;
  }

  .card-color {
    width: 60px;
    height: 60px;
    border-radius: 4px;
    margin: 0 auto;
  }

  .card-name {
    font-size: 12px;
    font-weight: bold;
  }

  .action-icon,
  .modifier-icon,
  .chaos-icon {
    font-size: 32px;
  }

  .action-name,
  .modifier-name,
  .chaos-name {
    font-size: 11px;
    font-weight: bold;
    margin-top: 4px;
  }
</style>
