<script lang="ts">
  // src/lib/components/game/GameLog.svelte
  import { gameEngine } from "../../gameStore.svelte";

  const gameState = gameEngine.state;

  // Newest first, so the latest event is always visible without scrolling
  const entries = $derived([...gameState.gameLog].reverse());

  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp; // fall back to raw value in unparsable
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
</script>

<div
  class="flex flex-col gap-1 max-h-64 overflow-y-auto bg-gray-50 border border-gray-200 rounded-md p-2 text-sm"
>
  {#if entries.length === 0}
    <p class="text-gray-400 italic">No events yet.</p>
  {:else}
    {#each entries as entry (entry.id)}
      <div class="flex gap-2">
        <span class="text-gray-400 text-xs shrink-0 pt-0.5">
          {formatTime(entry.timestamp)}
        </span>
        <span class="text-gray-700">{entry.message}</span>
      </div>
    {/each}
  {/if}
</div>
