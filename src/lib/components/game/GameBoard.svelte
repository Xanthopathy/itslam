<script lang="ts">
  // src/lib/components/game/GameBoard.svelte
  import { gameEngine } from "../../gameStore.svelte";
  import PlayerHand from "./PlayerHand.svelte";
  import PlayerField from "./PlayerField.svelte";
  import ChaosModal from "../modals/ChaosModal.svelte";
  import GameOverModal from "../modals/GameOverModal.svelte";
  import GameLog from "./GameLog.svelte";
  import type { Dispatcher } from "../../network/dispatcher";

  type Props = {
    localPlayerId: string;
    // Undefined only very briefly - root page only mounts GameBoard once roomCode is known, so this should always be set in practice.
    dispatcher: Dispatcher | undefined;
  };

  let { localPlayerId, dispatcher }: Props = $props();
  let selectionResetVersion = $state(0);

  const gameState = gameEngine.state;
  let localPlayer = $derived(
    gameState.players.find((p) => p.id === localPlayerId),
  );

  let turnSummary = $derived.by(() => {
    if (!localPlayer) return "Waiting for the game to start.";

    if (pendingPlay) {
      if (pendingPlay.mode === "player-target") {
        return "Choose a player to target.";
      }
      if (pendingPlay.mode === "sheep-target") {
        return "Choose a sheep to target.";
      }
      return "Choose a part to swap.";
    }

    if (awaitingDiscard) {
      return "Discard down to 7 cards to end your turn.";
    }

    if (gameState.currentTurnPlayerId === localPlayerId) {
      return "Your turn | Play a card, make a move, or end the turn.";
    }

    const currentPlayerName =
      gameEngine.getCurrentTurnPlayerName() ?? "the active player";
    return `${currentPlayerName} is taking their turn.`;
  });

  let latestEvent = $derived.by(() => {
    const latest = gameState.gameLog[gameState.gameLog.length - 1];
    return latest?.message ?? "The game is ready.";
  });

  // A play that's selected but that needs a target before it can be committed.
  // null = no pending play, nothing waiting on a target click.
  type PendingPlay = {
    cardIds: string[];
    mode: "player-target" | "sheep-target" | "part-target";
  };
  let pendingPlay: PendingPlay | null = $state(null);

  // Set to true only when the player has clicked "End Turn" with a hand over 7 - not just whenever hand.length > 7, since they're free to keep playing cards during the turn instead of discarding right away.
  let awaitingDiscard = $state(false);

  function attemptEndTurn() {
    if (!localPlayer) return;
    if (localPlayer.hand.length > 7) {
      awaitingDiscard = true;
      selectionResetVersion += 1;
      return;
    }
    dispatcher?.publish({
      type: "END_TURN",
      payload: { cardIdsToDiscard: [] },
    });

    selectionResetVersion += 1;
  }

  function handleDiscard(cardIds: string[]) {
    dispatcher?.publish({
      type: "END_TURN",
      payload: { cardIdsToDiscard: cardIds },
    });

    awaitingDiscard = false;
    selectionResetVersion += 1;
  }

  function handleHandPlay(cardIds: string[]) {
    if (!localPlayer) return;

    const card = localPlayer.hand.find((c) => c.id === cardIds[0]);
    if (!card) return;

    // 2-3 cards: always forming a sheep on your own field, never needs a target.
    if (cardIds.length >= 2) {
      dispatcher?.publish({
        type: "PLAY_CARDS",
        payload: { cardIds },
      });
      return;
    }

    // ReFlip: can be played off-turn during grace period, never needs a target.
    if (card.name === "ReFlip") {
      dispatcher?.publish({
        type: "PLAY_CARDS",
        payload: { cardIds },
      });
      return;
    }

    if (card.type === "head" || card.type === "butt") {
      pendingPlay = { cardIds, mode: "part-target" };
    } else if (card.type === "action") {
      pendingPlay = {
        cardIds,
        mode: card.name === "Yoink" ? "player-target" : "sheep-target",
      };
    } else if (card.type === "itslam") {
      if (card.name === "Recover 1 Sheep") {
        dispatcher?.publish({
          type: "PLAY_CARDS",
          payload: { cardIds },
        });
      } else {
        pendingPlay = { cardIds, mode: "player-target" };
      }
    }
  }

  function cancelPendingPlay() {
    pendingPlay = null;
  }

  // Committed once a target player is clicked (Yoink, or 4/5 itslam cards).
  function handlePlayerTarget(targetPlayerId: string) {
    if (!pendingPlay) return;
    dispatcher?.publish({
      type: "PLAY_CARDS",
      payload: { cardIds: pendingPlay.cardIds, targetPlayerId },
    });
    pendingPlay = null;
  }

  // Committed once a specific sheep is clicked (Wolf, Wheat).
  function handleSheepTarget(targetPlayerId: string, sheepIndex: number) {
    if (!pendingPlay) return;
    dispatcher?.publish({
      type: "PLAY_CARDS",
      payload: {
        cardIds: pendingPlay.cardIds,
        targetPlayerId,
        targetSheepIndex: sheepIndex,
      },
    });
    pendingPlay = null;
  }

  // Committed once a specific part within a sheep is clicked (head/butt swap).
  function handlePartTarget(
    targetPlayerId: string,
    sheepIndex: number,
    partIndex: 0 | 1,
  ) {
    if (!pendingPlay) return;
    dispatcher?.publish({
      type: "PLAY_CARDS",
      payload: {
        cardIds: pendingPlay.cardIds,
        targetPlayerId,
        targetSheepIndex: sheepIndex,
        targetPartIndex: partIndex,
      },
    });
    pendingPlay = null;
  }
</script>

{#if (gameState.status === "playing" || gameState.status === "finished") && localPlayer}
  {#if gameState.status === "playing"}
    <ChaosModal {localPlayerId} {dispatcher} />
  {/if}

  <div class="flex flex-col gap-4 p-4 relative">
    <!-- turn indicator + piles -->
    <div
      class="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-slate-100 p-4 shadow-sm"
    >
      <div
        class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
      >
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
            >
              Game status
            </span>
            <span
              class={[
                "rounded-full px-3 py-1 text-sm font-medium",
                gameState.currentTurnPlayerId === localPlayerId
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700",
              ].join(" ")}
            >
              {gameState.currentTurnPlayerId === localPlayerId
                ? "Your turn"
                : `${gameEngine.getCurrentTurnPlayerName() ?? "Active player"} to act`}
            </span>
          </div>
          <p class="text-lg font-semibold text-slate-800">{turnSummary}</p>
          <p class="text-sm text-slate-600">Latest event: {latestEvent}</p>
        </div>

        <div class="flex flex-wrap gap-2 text-sm text-slate-700">
          <span
            class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700"
          >
            Round {gameState.roundNumber}
          </span>
          <span class="rounded-full border border-slate-200 bg-white px-3 py-1">
            Draw pile: {gameState.drawPile.length}
          </span>
          <span class="rounded-full border border-slate-200 bg-white px-3 py-1">
            Discard: {gameState.discardPile.length}
          </span>
        </div>
      </div>
    </div>

    <GameLog />

    <!-- targetting banner, only visible mid-target-selection -->
    {#if pendingPlay}
      <div
        class="flex items-center justify-between bg-yellow-100 border border-yellow-300 rounded-md px-3 py-2 text-sm"
      >
        <span>
          {#if pendingPlay.mode === "player-target"}
            Choose a player to target.
          {:else if pendingPlay.mode === "sheep-target"}
            Choose a sheep to target.
          {:else}
            Choose which part to swap.
          {/if}
        </span>
        <button
          type="button"
          class="underline text-gray-600 hover:text-black"
          onclick={cancelPendingPlay}
        >
          Cancel
        </button>
      </div>
    {/if}

    <!-- discard banner, only visible once End Turn is clicked hand > 7 -->
    {#if awaitingDiscard}
      <div
        class="flex items-center justify-between bg-red-100 border border-red-300 rounded-md px-3 py-2 text-sm"
      >
        <span
          >You have more than 7 cards. Discard down to 7 to end your turn.</span
        >
      </div>
    {/if}

    <!-- all player fields, including your own -->
    <div class="grid gap-4 md:grid-cols-2">
      {#each gameState.players as player (player.id)}
        <PlayerField
          playerName={player.id === localPlayerId ? "You" : player.name}
          field={player.field}
          handSize={player.hand.length}
          isActive={gameState.currentTurnPlayerId === player.id}
          isLocalPlayer={player.id === localPlayerId}
          onSelectAsTarget={pendingPlay?.mode === "player-target"
            ? () => handlePlayerTarget(player.id)
            : undefined}
          onSheepClick={pendingPlay?.mode === "sheep-target"
            ? (sheepIndex) => handleSheepTarget(player.id, sheepIndex)
            : undefined}
          onPartClick={pendingPlay?.mode === "part-target"
            ? (sheepIndex, partIndex) =>
                handlePartTarget(player.id, sheepIndex, partIndex)
            : undefined}
        />
      {/each}
    </div>

    <!-- your hand -->
    <PlayerHand
      cards={localPlayer.hand}
      onPlay={handleHandPlay}
      onDiscard={handleDiscard}
      mode={awaitingDiscard ? "discard" : "play"}
      disabled={pendingPlay !== null ||
        gameState.currentTurnPlayerId !== localPlayerId}
      resetSelectionVersion={selectionResetVersion}
    />

    <!-- end turn, only on your turn and not mid-target-selection -->
    {#if gameState.currentTurnPlayerId === localPlayerId && !pendingPlay && !awaitingDiscard}
      <div class="flex justify-center">
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800"
          onclick={attemptEndTurn}
        >
          End Turn (Baa!)
        </button>
      </div>
    {/if}

    <GameOverModal {localPlayerId} {dispatcher} />
  </div>
{:else if gameState.status === "lobby"}
  <p class="text-center text-gray-500 p-8">Waiting for the game to start...</p>
{/if}
