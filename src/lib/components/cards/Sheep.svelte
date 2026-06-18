<script lang="ts">
  // src/lib/components/cards/Sheep.svelte
  import type { Sheep as SheepType, Card as CardType } from "$lib/types";
  import CardComponent from "./Card.svelte";

  let {
    sheep,
    selected = false,
    clickable = false,
    onClick = null,
  } = $props<{
    sheep: SheepType;
    selected?: boolean;
    clickable?: boolean;
    onClick?: (() => void) | null;
  }>();

  // TODO: Determine sheep validity visually
  const isValid = (): boolean => {
    // TODO: Implement
    return true;
  };

  const getBackgroundColor = (): string => {
    // TODO: Return color based on sheep's head color
    return "#f5f5f5";
  };
</script>

<div
  class={`sheep ${selected ? "selected" : ""} ${clickable ? "clickable" : ""} ${!isValid() ? "invalid" : ""}`}
  on:click={() => onClick?.()}
  role="button"
  tabindex="0"
  style="background-color: {getBackgroundColor()}"
>
  <!-- TODO: Display sheep parts and modifier -->
  <div class="sheep-parts">
    {#each sheep.parts as part}
      <CardComponent card={part} />
    {/each}
  </div>

  {#if sheep.modifier}
    <div class="sheep-modifier">
      <span class="modifier-badge">{sheep.modifier.name}</span>
    </div>
  {/if}
</div>

<style>
  .sheep {
    border: 2px solid #999;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: default;
    transition: all 0.2s;
  }

  .sheep.clickable {
    cursor: pointer;
  }

  .sheep.clickable:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .sheep.selected {
    box-shadow: 0 0 0 3px #4f46e5;
  }

  .sheep.invalid {
    opacity: 0.6;
    border-color: #ef4444;
  }

  .sheep-parts {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .sheep-modifier {
    text-align: center;
  }

  .modifier-badge {
    display: inline-block;
    background: #fbbf24;
    color: #000;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  }
</style>
