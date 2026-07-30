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
  class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm shadow-sm"
>
  <div class="flex items-center justify-between">
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
      Recent activity
    </p>
    <span
      class="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 shadow-sm"
    >
      {entries.length} event{entries.length === 1 ? "" : "s"}
    </span>
  </div>

  <div
    class="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md bg-white p-2"
  >
    {#if entries.length === 0}
      <p class="text-gray-400 italic">No events yet.</p>
    {:else}
      {#each entries as entry (entry.id)}
        <div class="flex gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
          <span class="shrink-0 pt-0.5 text-xs text-slate-400">
            {formatTime(entry.timestamp)}
          </span>
          <span class="text-slate-700">{entry.message}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
