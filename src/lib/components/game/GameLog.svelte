<script lang="ts">
  // src/lib/components/game/GameLog.svelte
  let { logs = [] } = $props<{
    logs?: { timestamp: number; message: string }[];
  }>();

  let scrollContainer: HTMLElement;

  // Auto-scroll to bottom when new message arrives
  $: if (scrollContainer && logs.length > 0) {
    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, 0);
  }

  const formatTime = (timestamp: number): string => {
    // TODO: Implement
    return new Date(timestamp).toLocaleTimeString();
  };
</script>

<div class="game-log">
  <div class="log-header">Game Log</div>
  <div class="log-messages" bind:this={scrollContainer}>
    {#if logs.length === 0}
      <div class="empty-log">Game started...</div>
    {:else}
      {#each logs as log (log.timestamp)}
        <div class="log-entry">
          <span class="log-time">{formatTime(log.timestamp)}</span>
          <span class="log-message">{log.message}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .game-log {
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    height: 300px;
  }

  .log-header {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
    font-weight: bold;
    font-size: 14px;
  }

  .log-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
  }

  .empty-log {
    color: #9ca3af;
    text-align: center;
    margin-top: auto;
    margin-bottom: auto;
  }

  .log-entry {
    display: flex;
    gap: 8px;
    padding: 6px;
    border-radius: 4px;
    background: white;
  }

  .log-time {
    color: #9ca3af;
    font-size: 11px;
    min-width: 50px;
  }

  .log-message {
    color: #374151;
    flex: 1;
  }

  .log-messages::-webkit-scrollbar {
    width: 6px;
  }

  .log-messages::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
</style>
