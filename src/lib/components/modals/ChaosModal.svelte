<script lang="ts">
  // src/lib/components/modals/ChaosModal.svelte
  import { gameEngine } from "../../gameStore";
  import CardComponent from "../cards/Card.svelte";
  import SheepComponent from "../cards/Sheep.svelte";
  import type { Dispatcher } from "../../network/dispatcher";

  type Props = {
    localPlayerId: string;
    dispatcher: Dispatcher | undefined;
  };

  let { localPlayerId, dispatcher }: Props = $props();

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
    dispatcher?.publish({
      type: "RESOLVE_ITSLAM",
      payload: {},
    });
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
    dispatcher?.publish({
      type: "RESOLVE_ITSLAM",
      payload: { sheepIndices: selectedSheepIndices },
    });
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
    dispatcher?.publish({
      type: "RESOLVE_ITSLAM",
      payload: {
        sheepIndices: selectedSheepIndices,
        targetPartIndices: partIndices,
      },
    });
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
    dispatcher?.publish({
      type: "RESOLVE_ITSLAM",
      payload: { discardIndices: selectedDiscardIndices },
    });
  }

  function predict(prediction: "looking" | "not_looking") {
    gameEngine.submitPrediction(localPlayerId, prediction);
    dispatcher?.publish({
      type: "SUBMIT_PREDICTION",
      payload: { prediction },
    });
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
      dispatcher?.publish({
        type: "SUBMIT_FLIP_RESULT",
        payload: { result },
      });
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
            dispatcher?.publish({
              type: "FINALIZE_COIN_FLIP",
              payload: {},
            });
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
        <p class="text-sm text-gray-600">Flipping the coin...</p>
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
          Anyone can play ReFlip in the next {secondsLeft}s...
        </p>
      {:else if flip.phase === "resolved"}
        {#if !isWinner}
          <p class="text-sm text-gray-600">
            {gameState.players.find((p) => p.id === flip.winnerId)?.name ??
              "No one"} won the flip and is resolving the effect...
          </p>
        {:else}
          <p class="text-sm text-gray-600">
            You won! Resolving: {flip.cardName}
          </p>

          {#if flip.cardName === "Yoink Entire Hand"}
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800"
              onclick={resolveYoink}
            >
              Take {loser?.name}'s hand
            </button>
          {:else if flip.cardName === "Lure 2 Sheep" || flip.cardName === "Remove 2 Sheep"}
            <p class="text-xs text-gray-500">
              Pick up to 2 sheep from {loser?.name}'s field ({selectedSheepIndices.length}/2)
            </p>
            <div class="flex gap-2 flex-wrap justify-center max-w-full">
              {#each loser?.field ?? [] as sheep, index (index)}
                <div
                  class={selectedSheepIndices.includes(index)
                    ? "ring-4 ring-yellow-300 rounded-xl"
                    : ""}
                >
                  <SheepComponent
                    {sheep}
                    size="sm"
                    onClick={() => toggleSheepIndex(index)}
                  />
                </div>
              {/each}
            </div>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-40"
              onclick={resolveSheepIndices}
            >
              Confirm
            </button>
          {:else if flip.cardName === "Halve 2 Sheep"}
            <p class="text-xs text-gray-500">
              Pick up to 2 parts from {loser?.name}'s sheep to take ({selectedSheepIndices.length}/2)
            </p>
            <div class="flex gap-2 flex-wrap justify-center max-w-full">
              {#each loser?.field ?? [] as sheep, index (index)}
                <div
                  class={selectedSheepIndices.includes(index)
                    ? "ring-4 ring-yellow-300 rounded-xl"
                    : ""}
                >
                  <SheepComponent
                    {sheep}
                    size="sm"
                    onPartClick={(partIndex) =>
                      togglePartSelection(index, partIndex)}
                  />
                </div>
              {/each}
            </div>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-40"
              onclick={resolveHalve}
            >
              Confirm
            </button>
          {:else if flip.cardName === "Recover 1 Sheep"}
            <p class="text-xs text-gray-500">
              Pick 2-3 cards from the discard pile that form a valid sheep ({selectedDiscardIndices.length}/3)
            </p>
            <div
              class="flex gap-2 flex-wrap justify-center max-w-full max-h-40 overflow-y-auto"
            >
              {#each gameState.discardPile as card, index (index)}
                <CardComponent
                  {card}
                  size="sm"
                  selected={selectedDiscardIndices.includes(index)}
                  onClick={() => toggleDiscardIndex(index)}
                />
              {/each}
            </div>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-40"
              disabled={selectedDiscardIndices.length < 2}
              onclick={resolveRecover}
            >
              Confirm
            </button>
          {/if}
        {/if}
      {/if}
    </div>
  </div>
{/if}
