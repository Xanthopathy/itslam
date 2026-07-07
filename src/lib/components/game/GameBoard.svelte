<script lang="ts">
  // src/lib/components/game/GameBoard.svelte
  import { gameEngine } from "$lib/gameStore";
  import type { Card } from "$lib/types";
  import PlayerHand from "./PlayerHand.svelte";
  import PlayerField from "./PlayerField.svelte";

  type Props = {
    localPlayerId: string;
  };

  let { localPlayerId }: Props = $props();

  const state = $derived(gameEngine.state);
  const localPlayer = $derived(
    state.players.find((p) => p.id === localPlayerId),
  );

  // A play that's selected but that needs a target before it can be committed.
  // null = no pending play, nothing waiting on a target click.
  type PendingPlay = {
    cardIds: string[];
    mode: "player-target" | "sheep-target" | "part-target";
  };
  let pendingPlay = $state<PendingPlay | null>(null);

  function handleHandPlay(cardIds: string[]) {
    if (!localPlayer) return;

    // 2-3 cards: always forming a sheep on your own field, never needs a target.
    if (cardIds.length >= 2) {
      gameEngine.playCards(localPlayerId, cardIds);
      return;
    }

    const card = localPlayer.hand.find((c) => c.id === cardIds[0]);
    if (!card) return;

    // ReFlip: gameStore special-cases this by name before checking type -
    // it never needs a target, and can be played off-turn during grace period.
    if (card.name === "ReFlip") {
      gameEngine.playCards(localPlayerId, cardIds);
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
      } else {
        pendingPlay = { cardIds, mode: "player-target" };
      }
    }
  }
</script>
