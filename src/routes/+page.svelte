<script lang="ts">
  // src/routes/+page.svelte
  import { gameEngine } from "$lib/gameStore";
  import LobbyModal from "$lib/components/modals/LobbyModal.svelte";
  import GameBoard from "$lib/components/game/GameBoard.svelte";

  const gameState = gameEngine.state;

  const STORAGE_KEY = "itslam_local_player_id";

  // Persistent per-browser identity, generated once and stored in
  // localStorage - so a refresh doesn't lose who you are mid-game. This
  // become the player's real id once InitGame runs, per the
  // InitGame({ id, name }[]) signature.
  let localPlayerId = $state("");

  // localStorage/crypto aren't available during SSR - this only runs client-side, which is fine since the whole app is client-driven anyway
  // (no server backend per PLAN.MD).
  $effect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    localPlayerId = id;
  });

  // The actual Lobby -> GameBoard transition. Once SYNC_STATE (or, for the
  // host, InitGame directly) populates state.players with an entry matching
  // our persistent id, `me` resolves and we're in the game.
  const me = $derived(gameState.players.find((p) => p.id === localPlayerId));
</script>

{#if !localPlayerId}
  <!-- brief flash while localStorage is read on Mount -->
{:else if !me}
  <LobbyModal {localPlayerId} />
{:else}
  <GameBoard {localPlayerId} />
{/if}
