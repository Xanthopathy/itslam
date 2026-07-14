<script lang="ts">
  // src/lib/components/modals/GameOverModal.svelte
  import { gameEngine } from "../../gameStore.svelte";

  type Props = {
    localPlayerId: string;
  };

  let { localPlayerId }: Props = $props();

  const gameState = gameEngine.state;

  const scores = $derived(
    gameState.status === "finished" ? gameEngine.getGameScore() : {},
  );
  const winners = $derived(
    gameState.status === "finished" ? gameEngine.getWinner() : [],
  );
  const isTie = $derived(winners.length > 1);

  // Leaderboard sorted highest score first
  const leaderboard = $derived(
    [...gameState.players]
      .map((p) => ({
        player: p,
        score: scores[p.name] ?? 0,
      }))
      .sort((a, b) => b.score - a.score),
  );

  const isHost = $derived(localPlayerId === gameState.hostId);

  function playAgain() {
    // Re-init with the same players, same seats, fresh deck/hands
    gameEngine.InitGame(
      gameState.players.map((p) => ({ id: p.id, name: p.name })),
    );
  }
</script>

{#if gameState.status === "finished"}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 w-96 flex flex-col gap-4 items-center">
      <h2 class="text-2xl font-bold">Game Over!</h2>

      {#if isTie}
        <p class="text-center text-gray-700">
          It's a tie between <strong
            >{winners.map((w) => w.name).join(" & ")}</strong
          >
        </p>
      {:else if winners.length === 1}
        <p class="text-center text-gray-700">
          <strong>{winners[0].name}</strong> wins!
        </p>
      {:else}
        <p class="text-center text-gray-700">No winner this round.</p>
      {/if}

      <!-- leaderboard -->
      <div class="w-full flex flex-col gap-1">
        {#each leaderboard as { player, score }, rank (player.id)}
          <div
            class={[
              "flex justify-between items-center px-3 py-2 rounded-md text-sm",
              winners.some((w) => w.id === player.id)
                ? "bg-yellow-100 font-semibold"
                : "bg-gray-50",
            ].join(" ")}
          >
            <span>
              #{rank + 1}
              {player.id === localPlayerId ? "You" : player.name}
            </span>
            <span>{score} pts</span>
          </div>
        {/each}
      </div>

      {#if isHost}
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800"
          onclick={playAgain}
        >
          Play Again
        </button>
      {:else}
        <p class="text-xs text-gray-500">
          Waiting for the host to start a new game...
        </p>
      {/if}
    </div>
  </div>
{/if}
