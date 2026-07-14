<script lang="ts">
  // src/lib/components/modals/LobbyModal.svelte
  import { gameEngine } from "../../gameStore";
  import { NetworkClient } from "../../network/client";
  import {
    createRoomCode,
    parseRoomCodeFromUrl,
    sanitizeRoomCode,
  } from "../../network/topics";
  import type { RoomActionMessage } from "../../network/messages";

  type Props = {
    // Persistent per-browser identity, generated/stored by the root page
    // (localStorage-backed UUID) - NOT generated here
    localPlayerId: string;
    networkClient: NetworkClient;
    roomCode: string;
  };

  let {
    localPlayerId,
    networkClient,
    roomCode = $bindable(""),
  }: Props = $props();

  const gameState = gameEngine.state;

  type Screen = "landing" | "enter-name" | "waiting-room";
  let screen = $state<Screen>("landing");
  let isHosting = $state(false);
  let playerNameInput = $state("");
  let roomCodeInput = $state(""); // manual entry for joiners without a ?room= link

  // Joined players seen so far, keyed by id. Not part of GameState - this is
  // purely a pre-InitGame client-side list built from PLAYER_JOINED messages
  let joinedPlayers = $state<{ id: string; name: string }[]>([]);

  // On mount: if the URL already has ?room=, skip the landing screen
  // entirely and go straight to name entry as a joiner
  $effect(() => {
    const detected = parseRoomCodeFromUrl(new URL(window.location.href));
    if (detected) {
      roomCode = detected;
      isHosting = false;
      screen = "enter-name";
    }
  });

  function hostGame() {
    roomCode = createRoomCode();
    isHosting = true;
    // Reflect the room in the URL so it can be shared as a link, without
    // a page reload - per PLAN.MD's "Room Joining via Shareable Link".
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomCode);
    history.pushState({}, "", url);
    screen = "enter-name";
  }

  function goToJoinScreen() {
    isHosting = false;
    screen = "enter-name";
  }

  function handleIncomingMessage(message: RoomActionMessage) {
    if (message.type === "PLAYER_JOINED") {
      if (joinedPlayers.some((p) => p.id === message.playerId)) return; // already known
      joinedPlayers = [
        ...joinedPlayers,
        { id: message.playerId, name: message.payload.playerName },
      ];
    } else if (message.type === "SYNC_STATE") {
      // Once this lands, state.players is populated
      // and the root page's `me` lookup (by localPlayerId) resolves,
      // which is what actually transitions away from this modal.
      gameEngine.loadState(message.payload.state);
    }
  }

  async function submitName() {
    const name = playerNameInput.trim();
    if (!name) return;

    if (!isHosting) {
      // Joining without a ?room= link (typed manually)
      if (!roomCode) roomCode = sanitizeRoomCode(roomCodeInput);
      if (!roomCode) return;
    }

    await networkClient.connect();
    await networkClient.subscribeToRoom(roomCode, handleIncomingMessage);

    await networkClient.publishToRoom({
      type: "PLAYER_JOINED",
      payload: { playerName: name },
      roomCode,
      playerId: localPlayerId,
      sentAt: Date.now(),
    });

    // BroadcastChannel doesn't echo our own publish back to us - add
    // ourselves locally rather than waiting for a message that won't arrive
    joinedPlayers = [...joinedPlayers, { id: localPlayerId, name }];

    screen = "waiting-room";
  }

  $effect(() => {
    return () => {
      if (roomCode)
        networkClient.unsubscribeFromRoom(roomCode, handleIncomingMessage);
    };
  });

  const canStart = $derived(joinedPlayers.length >= 2);

  async function startGame() {
    if (!canStart) return;

    gameEngine.InitGame(joinedPlayers.map((p) => ({ id: p.id, name: p.name })));

    // Broadcast the resulting state (with the real shuffle already applied)
    // so every other client applies the exact same result instead of
    // computing their own with different randomness.
    await networkClient.publishToRoom({
      type: "SYNC_STATE",
      payload: { state: $state.snapshot(gameEngine.state) },
      roomCode,
      playerId: localPlayerId,
      sentAt: Date.now(),
    });
  }
</script>

{#if gameState.status === "lobby"}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 w-96 flex flex-col gap-4 items-center">
      {#if screen === "landing"}
        <h2 class="text-xl font-bold">Is That Sheep Looking At Me?</h2>
        <button
          type="button"
          class="w-full px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800"
          onclick={hostGame}
        >
          Host Game
        </button>
        <button
          type="button"
          class="w-full px-4 py-2 rounded-md bg-slate-700 text-white font-semibold hover:bg-slate-800"
          onclick={goToJoinScreen}
        >
          Join Game
        </button>
      {:else if screen === "enter-name"}
        {#if isHosting}
          <p class="text-sm text-gray-600">
            Share this link so others can join:
          </p>
          <code class="bg-gray-100 rounded px-2 py-1 text-sm break-all">
            {window.location.href}
          </code>
        {:else if !roomCode}
          <label class="w-full flex flex-col gap-1 text-sm text-gray-600">
            Room code
            <input
              type="text"
              class="border rounded-md px-3 py-2"
              placeholder="SHEEP-1234"
              bind:value={roomCodeInput}
            />
          </label>
        {:else}
          <p class="text-sm text-gray-600">Joining room {roomCode}</p>
        {/if}

        <label class="w-full flex flex-col gap-1 text-sm text-gray-600">
          Your name
          <input
            type="text"
            class="border rounded-md px-3 py-2"
            placeholder="Enter your name"
            bind:value={playerNameInput}
            onkeydown={(e) => e.key === "Enter" && submitName()}
          />
        </label>

        <button
          type="button"
          class="w-full px-4 py-2 rounded-md bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-40"
          disabled={!playerNameInput.trim()}
          onclick={submitName}
        >
          Continue
        </button>
      {:else if screen === "waiting-room"}
        <h2 class="text-lg font-bold">Room {roomCode}</h2>
        <p class="text-sm text-gray-600">Waiting for players...</p>

        <div class="w-full flex flex-col gap-1">
          {#each joinedPlayers as player (player.id)}
            <div class="bg-gray-50 rounded-md px-3 py-2 text-sm">
              {player.name}
              {player.id === localPlayerId ? "(You)" : ""}
            </div>
          {/each}
        </div>

        {#if isHosting}
          <button
            type="button"
            class="w-full px-4 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-40"
            disabled={!canStart}
            onclick={startGame}
          >
            Start Game
            {#if !canStart}(need at least 2 players){/if}
          </button>
        {:else}
          <p class="text-xs text-gray-500">
            Waiting for the host to start the game...
          </p>
        {/if}
      {/if}
    </div>
  </div>
{/if}
