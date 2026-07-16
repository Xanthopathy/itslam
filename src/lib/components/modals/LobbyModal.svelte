<script lang="ts">
  // src/lib/components/modals/LobbyModal.svelte
  import { pushState } from "$app/navigation";
  import { gameEngine } from "../../gameStore.svelte";
  import { NetworkClient } from "../../network/client";
  import {
    createRoomCode,
    parseRoomCodeFromUrl,
    sanitizeRoomCode,
  } from "../../network/topics";
  import type { RoomActionMessage } from "../../network/messages";
  import { loadGameStateSnapshot } from "../../network/persistence";

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
  const LOBBY_SESSION_KEY = "itslam_lobby_session";
  const LAST_PLAYER_NAME_KEY = "itslam_last_player_name";

  type Screen = "landing" | "enter-name" | "waiting-room";
  let screen = $state<Screen>("landing");
  let isHosting = $state(false);
  let isSubmitting = $state(false);
  let isReconnecting = $state(false);
  let submitError = $state("");
  let playerNameInput = $state("");
  let roomCodeInput = $state(""); // manual entry for joiners without a ?room= link

  // Joined players seen so far, keyed by id. Not part of GameState - this is
  // purely a pre-InitGame client-side list built from PLAYER_JOINED messages
  let joinedPlayers = $state<{ id: string; name: string }[]>([]);

  // Restore the most recently used name for new joins and new rooms.
  $effect(() => {
    const savedName = localStorage.getItem(LAST_PLAYER_NAME_KEY);

    if (savedName && !playerNameInput) {
      playerNameInput = savedName;
    }
  });

  // On mount: if the URL already has ?room=, skip the landing screen
  // entirely and go straight to name entry as a joiner
  $effect(() => {
    const detected = parseRoomCodeFromUrl(new URL(window.location.href));
    if (detected) {
      const savedSession = localStorage.getItem(LOBBY_SESSION_KEY);
      let isReturningHost = false;

      if (savedSession) {
        try {
          const session = JSON.parse(savedSession) as {
            playerId?: string;
            roomCode?: string;
            isHosting?: boolean;
            playerName?: string;
          };

          const isReturningPlayer =
            session.playerId === localPlayerId && session.roomCode === detected;

          isReturningHost = isReturningPlayer && session.isHosting === true;

          if (isReturningPlayer && session.playerName) {
            playerNameInput = session.playerName;
            isReconnecting = true;

            setTimeout(() => {
              if (screen === "enter-name") {
                void submitName({ isReconnect: true });
              }
            }, 0);
          }
        } catch {
          localStorage.removeItem(LOBBY_SESSION_KEY);
        }
      }

      roomCode = detected;
      isHosting = isReturningHost;
      screen = "enter-name";
    }
  });

  function hostGame() {
    roomCode = createRoomCode();
    isHosting = true;
    localStorage.setItem(
      LOBBY_SESSION_KEY,
      JSON.stringify({
        playerId: localPlayerId,
        roomCode,
        isHosting: true,
      }),
    );
    // Reflect the room in the URL so it can be shared as a link, without
    // a page reload - per PLAN.MD's "Room Joining via Shareable Link".
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomCode);
    pushState(`${url.pathname}${url.search}${url.hash}`, {});
    screen = "enter-name";
  }

  function goToJoinScreen() {
    isHosting = false;
    screen = "enter-name";
  }

  function handleIncomingMessage(message: RoomActionMessage) {
    if (message.type === "PLAYER_JOINED") {
      upsertJoinedPlayer(message.playerId, message.payload.playerName);
    } else if (message.type === "PLAYER_LIST_REQUEST") {
      const name = playerNameInput.trim();
      if (name) void publishPlayerJoined(name);
    } else if (message.type === "SYNC_STATE") {
      // Once this lands, state.players is populated
      // and the root page's `me` lookup (by localPlayerId) resolves,
      // which is what actually transitions away from this modal.
      gameEngine.loadState(message.payload.state);
    }
  }

  async function publishPlayerJoined(name: string): Promise<void> {
    await networkClient.publishToRoom({
      type: "PLAYER_JOINED",
      payload: { playerName: name },
      roomCode,
      playerId: localPlayerId,
      sentAt: Date.now(),
    });
  }

  function upsertJoinedPlayer(id: string, name: string): void {
    const existing = joinedPlayers.findIndex((p) => p.id === id);
    if (existing === -1) {
      joinedPlayers = [...joinedPlayers, { id, name }];
      return;
    }
    if (joinedPlayers[existing]?.name === name) return;
    joinedPlayers = joinedPlayers.map((p) => (p.id === id ? { id, name } : p));
  }

  async function submitName(options?: { isReconnect?: boolean }) {
    if (isSubmitting) return;

    const name = playerNameInput.trim();
    if (!name) return;

    localStorage.setItem(LAST_PLAYER_NAME_KEY, name);

    submitError = "";
    isSubmitting = true;

    try {
      if (!isHosting) {
        // Joining without a ?room= link (typed manually)
        if (!roomCode) roomCode = sanitizeRoomCode(roomCodeInput);
        if (!roomCode) return;

        // Keep the URL shareable and stable after manual room-code join.
        const url = new URL(window.location.href);
        if (url.searchParams.get("room") !== roomCode) {
          url.searchParams.set("room", roomCode);
          pushState(`${url.pathname}${url.search}${url.hash}`, {});
        }
      }

      await networkClient.connect();
      await networkClient.subscribeToRoom(roomCode, handleIncomingMessage);

      const savedGameState = loadGameStateSnapshot(roomCode);
      if (savedGameState) gameEngine.loadState(savedGameState);

      await publishPlayerJoined(name);

      localStorage.setItem(
        LOBBY_SESSION_KEY,
        JSON.stringify({
          playerId: localPlayerId,
          roomCode,
          isHosting,
          playerName: name,
        }),
      );

      // Add ourselves immediately so the waiting-room list updates even
      // before our own join event arrives over the network.
      upsertJoinedPlayer(localPlayerId, name);

      await networkClient.publishToRoom({
        type: "PLAYER_LIST_REQUEST",
        payload: {},
        roomCode,
        playerId: localPlayerId,
        sentAt: Date.now(),
      });

      await networkClient.publishToRoom({
        type: "REQUEST_SYNC_STATE",
        payload: {},
        roomCode,
        playerId: localPlayerId,
        sentAt: Date.now(),
      });

      screen = "waiting-room";
    } catch (error) {
      console.error("Unable to connect to room", error);
      submitError = options?.isReconnect
        ? "Reconnection failed. Please try Continue again."
        : "Unable to join room right now. Please try again.";
    } finally {
      isSubmitting = false;
      isReconnecting = false;
    }
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

    gameEngine.InitGame(
      joinedPlayers.map((p) => ({ id: p.id, name: p.name })),
      roomCode,
    );

    // Broadcast the resulting state (with the real shuffle already applied)
    // so every other client applies the exact same result instead of
    // computing their own with different randomness.
    await networkClient.publishToRoom(
      {
        type: "SYNC_STATE",
        payload: { state: $state.snapshot(gameEngine.state) },
        roomCode,
        playerId: localPlayerId,
        sentAt: Date.now(),
      },
      { retain: true },
    );
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
              placeholder="1234"
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
          disabled={!playerNameInput.trim() || isSubmitting}
          onclick={() => void submitName()}
        >
          {#if isReconnecting || isSubmitting}
            <span class="inline-flex items-center gap-2">
              <span
                class="h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin"
              ></span>
              {isReconnecting ? "Reconnecting..." : "Connecting..."}
            </span>
          {:else}
            Continue
          {/if}
        </button>

        {#if submitError}
          <p class="w-full text-xs text-red-600">{submitError}</p>
        {/if}
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
