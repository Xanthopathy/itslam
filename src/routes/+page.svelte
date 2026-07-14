<script lang="ts">
  // src/routes/+page.svelte
  import { gameEngine } from "$lib/gameStore.svelte";
  import LobbyModal from "$lib/components/modals/LobbyModal.svelte";
  import GameBoard from "$lib/components/game/GameBoard.svelte";
  import { NetworkClient } from "$lib/network/client";
  import { createMqttAdapter } from "$lib/network/adapters/mqttAdapter";
  import { createDispatcher } from "$lib/network/dispatcher";

  const gameState = gameEngine.state;

  const STORAGE_KEY = "itslam_local_player_id";

  let localPlayerId = $state("");

  $effect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    localPlayerId = id;
  });

  const me = $derived(gameState.players.find((p) => p.id === localPlayerId));

  // Owned here, not in LobbyModal - GameBoard/ChaosModal need this same
  // connected client and room code after the handoff, not a fresh one.
  const networkClient = new NetworkClient(createMqttAdapter());
  let roomCode = $state("");

  const isHost = $derived(gameState.hostId === localPlayerId);
  const dispatcher = $derived(
    roomCode
      ? createDispatcher(networkClient, roomCode, localPlayerId, () => isHost)
      : undefined,
  );

  // Subscribe once we have a room code and dispatcher - this is what makes
  // OTHER clients' actions take effect here (LobbyModal's own subscription,
  // set up during join, only lasts until it unmounts post-handoff).
  $effect(() => {
    if (!roomCode || !dispatcher) return;
    let active = true;

    void (async () => {
      try {
        await networkClient.connect();
        if (!active) return;
        await networkClient.subscribeToRoom(roomCode, dispatcher.applyIncoming);
      } catch (error) {
        console.error("Unable to connect to the game room:", error);
      }
    })();

    return () => {
      active = false;
      networkClient.unsubscribeFromRoom(roomCode, dispatcher.applyIncoming);
    };
  });
</script>

{#if !localPlayerId}
  <!-- brief flash while localStorage is read on mount -->
{:else if !me}
  <LobbyModal {localPlayerId} {networkClient} bind:roomCode />
{:else}
  <GameBoard {localPlayerId} {dispatcher} />
{/if}
