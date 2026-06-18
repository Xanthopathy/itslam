<script lang="ts">
  // src/lib/components/modals/GameOverModal.svelte
  import type { Player } from "$lib/types";

  let {
    winners = [],
    scores = {},
    onPlayAgain = null,
  } = $props<{
    winners?: Player[];
    scores?: Record<string, number>;
    onPlayAgain?: (() => void) | null;
  }>();

  // Sort players by score
  const sortedPlayers = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score }));
</script>

<div class="modal-overlay">
  <div class="modal-content game-over-modal">
    <h1>🎉 Game Over!</h1>

    <div class="winners-section">
      <h2>
        {#if winners.length === 1}
          🏆 {winners[0].name} wins!
        {:else}
          🏆 Tied!
        {/if}
      </h2>
    </div>

    <div class="scores-section">
      <table class="scores-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedPlayers as { name, score }, i}
            <tr class={i === 0 ? "winner" : ""}>
              <td>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {name}</td>
              <td class="score">{score}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <button class="play-again-btn" on:click={() => onPlayAgain?.()}
      >Play Again</button
    >
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    text-align: center;
  }

  .game-over-modal h1 {
    margin: 0 0 24px;
    font-size: 36px;
  }

  .winners-section h2 {
    margin: 0 0 24px;
    font-size: 24px;
    color: #10b981;
  }

  .scores-section {
    margin: 32px 0;
  }

  .scores-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }

  .scores-table thead {
    border-bottom: 2px solid #e5e7eb;
  }

  .scores-table th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
  }

  .scores-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #f3f4f6;
  }

  .scores-table tr.winner {
    background: #fffbeb;
  }

  .scores-table .score {
    text-align: right;
    font-weight: 600;
    color: #4f46e5;
  }

  .play-again-btn {
    background: #10b981;
    color: white;
    padding: 12px 32px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .play-again-btn:hover {
    background: #059669;
    transform: translateY(-2px);
  }
</style>
