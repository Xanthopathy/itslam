<script lang="ts">
  // src/lib/components/game/PlayerHand.svelte
  import type { Card } from "$lib/types";
  import CardComponent from "$lib/components/cards/Card.svelte";

  type Props = {
    cards: Card[];
    // Called when the player commits a play (1-3 selected card ids).
    // This component does NOT call gameEngine directly.
    onPlay?: (cardIds: string[]) => void;
    disabled?: boolean;
  };

  let { cards, onPlay, disabled = false }: Props = $props();

  // Local, transient selection - cleared after a successful play or manually.
  let selectedIds = $state<string[]>([]);

  // refer to playCards, there are no valid 4+ plays
  const MAX_SELECTABLE = 3;

  function toggleCard(card: Card) {
    if (disabled) return;

    if (selectedIds.includes(card.id)) {
      selectedIds = selectedIds.filter((id) => id !== card.id);
      return;
    }
    if (selectedIds.length >= MAX_SELECTABLE) return; // silently ignore, button below stays disabled too
    selectedIds = [...selectedIds, card.id];
  }

  function clearSelection() {
    selectedIds = [];
  }

  function commitPlay() {
    if (selectedIds.length === 0) return;
    onPlay?.(selectedIds);
    // Optimistically clear; if the engine rejects the play, the parent
    // is responsible for surfacing that (e.g. via a toast), not this component.
    selectedIds = [];
  }
</script>

<div class="flex flex-col items-center gap-2">
  <!-- the hand itself -->
  <div class="flex gap-2 overflow-x-auto px-2 py-4">
    {#each cards as card (card.id)}
      <CardComponent
        {card}
        size="md"
        selected={selectedIds.includes(card.id)}
        disabled={disabled ||
          (!selectedIds.includes(card.id) &&
            selectedIds.length >= MAX_SELECTABLE)}
        onClick={toggleCard}
      />
    {/each}
  </div>

  <!-- action bar -->
  <div class="flex items-center gap-3 text-sm">
    <span class="text-gray-600">
      {selectedIds.length} / {MAX_SELECTABLE} selected
    </span>
    <button
      type="button"
      class="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-40"
      disabled={selectedIds.length === 0}
      onclick={clearSelection}
    >
      Clear
    </button>
    <button
      type="button"
      class="px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
      disabled={selectedIds.length === 0 || disabled}
      onclick={commitPlay}
    >
      Play</button
    >
  </div>
</div>
