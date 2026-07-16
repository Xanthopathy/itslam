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
    // Undefined only very briefly - root page only mounts GameBoard once
    // roomCode is known, so this should always be set in practice.
    dispatcher: Dispatcher | undefined;
  };

  let { localPlayerId, dispatcher }: Props = $props();

  const gameState = gameEngine.state;
  let localPlayer = $derived(
    gameState.players.find((p) => p.id === localPlayerId),
  );

  // A play that's selected but that needs a target before it can be committed.
  // null = no pending play, nothing waiting on a target click.
  type PendingPlay = {
    cardIds: string[];
    mode: "player-target" | "sheep-target" | "part-target";
  };
  let pendingPlay: PendingPlay | null = $state(null);

  // Set to true only when the player has clicked "End Turn" with a hand
  // over 7 - not just whenever hand.length > 7, since they're free to keep
  // playing cards during the turn instead of discarding right away.
  let awaitingDiscard = $state(false);

  function attemptEndTurn() {
    if (!localPlayer) return;
    if (localPlayer.hand.length > 7) {
      awaitingDiscard = true;
      return;
    }
    gameEngine.endTurn(localPlayerId, []);
    dispatcher?.publish({
      type: "END_TURN",
      payload: { cardIdsToDiscard: [] },
    });
  }

  function handleDiscard(cardIds: string[]) {
    gameEngine.endTurn(localPlayerId, cardIds);
    dispatcher?.publish({
      type: "END_TURN",
      payload: { cardIdsToDiscard: cardIds },
    });
    awaitingDiscard = false;
  }

  function handleHandPlay(cardIds: string[]) {
    if (!localPlayer) return;

    // 2-3 cards: always forming a sheep on your own field, never needs a target.
    if (cardIds.length >= 2) {
      gameEngine.playCards(localPlayerId, cardIds);
      dispatcher?.publish({
        type: "PLAY_CARDS",
        payload: { cardIds },
      });
      return;
    }

    const card = localPlayer.hand.find((c) => c.id === cardIds[0]);
    if (!card) return;

    // ReFlip: gameStore special-cases this by name before checking type -
    // it never needs a target, and can be played off-turn during grace period.
    if (card.name === "ReFlip") {
      gameEngine.playCards(localPlayerId, cardIds);
      dispatcher?.publish({
        type: "PLAY_CARDS",
        payload: { cardIds },
      });
      return;
    }

    if (card.type === "head" || card.type === "butt") {
      pendingPlay = { cardIds, mode: "part-target" };
    } else if (card.type === "action") {
      // Yoink targets a player only; Wolf/Wheat target a specific sheep.
      pendingPlay = {
        cardIds,
        mode: card.name === "Yoink" ? "player-target" : "sheep-target",
      };
    } else if (card.type === "itslam") {
      // playItslamCard rejects any card other than "Recover 1 Sheep"
      // without a targetPlayer - so only Recover skips the target step.
      if (card.name === "Recover 1 Sheep") {
        gameEngine.playCards(localPlayerId, cardIds);
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
    gameEngine.playCards(localPlayerId, pendingPlay.cardIds, targetPlayerId);
    dispatcher?.publish({
      type: "PLAY_CARDS",
      payload: { cardIds: pendingPlay.cardIds, targetPlayerId },
    });
    pendingPlay = null;
  }

  // Committed once a specific sheep is clicked (Wolf, Wheat).
  function handleSheepTarget(targetPlayerId: string, sheepIndex: number) {
    if (!pendingPlay) return;
    gameEngine.playCards(
      localPlayerId,
      pendingPlay.cardIds,
      targetPlayerId,
      sheepIndex,
    );
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
    gameEngine.playCards(
      localPlayerId,
      pendingPlay.cardIds,
      targetPlayerId,
      sheepIndex,
      partIndex,
    );
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

{#if gameState.status === "playing" && localPlayer}
  <ChaosModal {localPlayerId} {dispatcher} />

  <div class="flex flex-col gap-4 p-4">
    <!-- turn indicator + piles -->
    <div class="flex justify-between items-center text-sm text-gray-600">
      <span>
        {#if gameState.currentTurnPlayerId === localPlayerId}
          <strong class="text-green-700">Your turn</strong>
        {:else}
          Waiting on {gameEngine.getCurrentTurnPlayerName()}
        {/if}
      </span>
      <span
        >Draw pile: {gameState.drawPile.length} | Discard: {gameState
          .discardPile.length}</span
      >
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
    <div class="flex flex-col gap-4">
      {#each gameState.players as player (player.id)}
        <PlayerField
          playerName={player.id === localPlayerId ? "You" : player.name}
          field={player.field}
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
  </div>
{:else if gameState.status === "lobby"}
  <p class="text-center text-gray-500 p-8">Waiting for the game to start...</p>
{:else if gameState.status === "finished"}
  <GameOverModal {localPlayerId} />
{/if}
