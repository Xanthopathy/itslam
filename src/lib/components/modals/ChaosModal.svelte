<script lang="ts">
  // src/lib/components/modals/ChaosModal.svelte
  import { gameEngine } from "$lib/gameStore";
  import CardComponent from "$lib/components/cards/Card.svelte";
  import SheepComponent from "$lib/components/cards/Sheep.svelte";

  type Props = {
    localPlayerId: string;
  };

  let { localPlayerId }: Props = $props();

  const gameState = gameEngine.state;
  const flip = $derived(gameState.activeCoinFlip);

  const isChallenger = $derived(flip?.challengerId === localPlayerId);
  const isDefender = $derived(flip?.defenderId === localPlayerId);

  // Loser is whichever of challenger/defender didn't win. Mirrors
  // resolveItslamEffect's own loserId derivation in itslam.ts.
  const loser = $derived.by(() => {
    if (!flip?.winnerId || !flip.defenderId) return undefined;
    const loserId =
      flip.winnerId === flip.challengerId ? flip.defenderId : flip.challengerId;
    return gameState.players.find((p) => p.id === loserId);
  });
  const isWinner = $derived(flip?.winnerId === localPlayerId);

  function resolveYoink() {
    gameEngine.resolveItslamEffect(localPlayerId);
  }

  // Shared selection state for Lure 2 Sheep / Remove 2 Sheep (just indices)
  // and Halve 2 Sheep (indices + which part of each). Reset whenever a new
  // coin flip starts, so a stale selection from a previous round can't leak in.
  let selectedSheepIndices = $state<number[]>([]);
  let selectedPartIndices = $state<Record<number, 0 | 1>>({});

  $effect(() => {
    flip?.cardId; // reset whenever a new card/flip comes up
    selectedSheepIndices = [];
    selectedPartIndices = {};
  });

  function toggleSheepIndex(index: number) {
    if (selectedSheepIndices.includes(index)) {
      selectedSheepIndices = selectedSheepIndices.filter((i) => i !== index);
      const { [index]: _removed, ...rest } = selectedPartIndices;
      selectedPartIndices = rest;
    } else if (selectedSheepIndices.length < 2) {
      selectedSheepIndices = [...selectedSheepIndices, index];
    }
  }

  function resolveSheepIndices() {
    gameEngine.resolveItslamEffect(localPlayerId, selectedSheepIndices);
  }

  function togglePartSelection(sheepIndex: number, partIndex: 0 | 1) {
    if (sheepIndex in selectedPartIndices) {
      const { [sheepIndex]: _removed, ...rest } = selectedPartIndices;
      selectedPartIndices = rest;
      selectedSheepIndices = selectedSheepIndices.filter(
        (i) => i !== sheepIndex,
      );
    } else if (selectedSheepIndices.length < 2) {
      selectedPartIndices = { ...selectedPartIndices, [sheepIndex]: partIndex };
      selectedSheepIndices = [...selectedSheepIndices, sheepIndex];
    }
  }

  function resolveHalve() {
    const partIndices = selectedSheepIndices.map((i) => selectedPartIndices[i]);
    gameEngine.resolveItslamEffect(
      localPlayerId,
      selectedSheepIndices,
      partIndices,
    );
  }

  // Recover 1 Sheep: pick 2-3 cards from the discard pile (not the loser's
  // field at all). Also reset alongside the sheep-index selections above.
  let selectedDiscardIndices = $state<number[]>([]);

  $effect(() => {
    flip?.cardId;
    selectedDiscardIndices = [];
  });

  function toggleDiscardIndex(index: number) {
    if (selectedDiscardIndices.includes(index)) {
      selectedDiscardIndices = selectedDiscardIndices.filter(
        (i) => i !== index,
      );
    } else if (selectedDiscardIndices.length < 3) {
      selectedDiscardIndices = [...selectedDiscardIndices, index];
    }
  }

  function resolveRecover() {
    gameEngine.resolveItslamEffect(
      localPlayerId,
      undefined,
      undefined,
      selectedDiscardIndices,
    );
  }

  function predict(prediction: "looking" | "not_looking") {
    gameEngine.submitPrediction(localPlayerId, prediction);
  }

  const isHost = $derived(localPlayerId === gameState.hostId);

  // Only the host generates + submits the result, and only after a fixed
  // delay - so the "reveal" is what gets synced to other clients, not the
  // moment the host's own internals already knew the answer. This means
  // every client's flip animation runs for roughly the same visible
  // duration regardless of when their own state update actually lands.
  $effect(() => {
    if (flip?.phase !== "flipping" || !isHost) return;

    const timer = setTimeout(() => {
      const result = gameEngine.generateFlipResult();
      gameEngine.submitFlipResult(localPlayerId, result);
    }, 3000);

    return () => clearTimeout(timer);
  });

  // Live countdown display for the grace period.
  let secondsLeft = $state(0);

  $effect(() => {
    if (flip?.phase !== "grace_period" || !flip.graceWindowEndsAt) return;
    const endsAt = flip.graceWindowEndsAt;

    const tick = () => {
      secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    };
    tick();
    const interval = setInterval(tick, 250);

    // Deterministic from already-synced state (prediction + result), so
    // every client finalizing locally is safe - unlike the flip step above,
    // this isn't introducing new randomness that needs a single source.
    const finalizeTimer = isHost
      ? setTimeout(
          () => {
            gameEngine.finalizeCoinFlip(localPlayerId);
          },
          Math.max(0, endsAt - Date.now()),
        )
      : undefined;

    return () => {
      clearInterval(interval);
      if (finalizeTimer) clearTimeout(finalizeTimer);
    };
  });
</script>

{#if flip}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 w-80 flex flex-col gap-4 items-center">
      <h2 class="text-lg font-bold">{flip.cardName}</h2>

      {#if flip.phase === "awaiting_prediction"}
        {#if isChallenger}
          <p class="text-sm text-gray-600">Is that sheep looking at you?</p>
          <div class="flex gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800"
              onclick={() => predict("looking")}
            >
              Looking
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-slate-700 text-white font-semibold hover:bg-slate-800"
              onclick={() => predict("not_looking")}
            >
              Not Looking
            </button>
          </div>
        {:else}
          <p class="text-sm text-gray-600">
            Waiting for the challenger to make a prediction...
          </p>
        {/if}
      {:else if flip.phase === "flipping"}
        <div class="text-5xl animate-spin">🪙 [coin]</div>
        <p class="">Flipping the coin...</p>
      {:else if flip.phase === "grace_period"}
        <div class="text-5xl">
          {flip.result === "looking" ? "[heat]" : "[butt]"}
        </div>
        <p class="text-sm text-gray-600">
          The sheep is <strong
            >{flip.result === "looking" ? "looking" : "not looking"}</strong
          > at you
        </p>
        <p class="text-xs text-gray-500">
          Anyone can play Re-flip in the next {secondsLeft}s...
        </p>
      {:else if flip.phase === "resolved"}
        <p class="text-sm text-gray-600">resolved UI goes here</p>
      {/if}
    </div>
  </div>
{/if}
