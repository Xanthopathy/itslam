<script lang="ts">
  import { onMount } from "svelte";
  import {
    gameState,
    uiState,
    playerNames,
    currentPlayerid,
    gameOverState,
  } from "$lib/stores";
  import { gameEngine } from "$lib/gamestore";
  import LobbyModal from "$lib/components/modals/LobbyModal.svelte";
  import GameBoard from "$lib/components/game/GameBoard.svelte";
  import PlayerHand from "$lib/components/game/PlayerHand.svelte";
  import ActionPanel from "$lib/components/game/ActionPanel.svelte";
  import GameLog from "$lib/components/game/GameLog.svelte";
  import CoinFlipModal from "$lib/components/modals/CoinFlipModal.svelte";
  import GameOverModal from "$lib/components/modals/GameOverModal.svelte";

  let currentGameState: any;
  let currentUiState: any;

  gameState.subscribe((state) => {
    currentGameState = state;
  });

  uiState.subscribe((state) => {
    currentUiState = state;
  });

  const handleGameStart = (names: string[]) => {
    // TODO: Initialize game with player names
    // gameEngine.InitGame(names);
    // Update stores
    playerNames.set(names);
    uiState.update((state) => ({ ...state, gameStarted: true }));
  };

  const handlePlayAgain = () => {
    // TODO: Reset game state and show lobby again
  };

  onMount(() => {
    // TODO: Setup keyboard shortcuts
    // TODO: Setup multiplayer sync (websockets if needed)
  });
</script>

{#if !currentUiState?.gameStarted}
  <LobbyModal
    playerCount={currentUiState?.playerCount || 2}
    playerNames={$playerNames}
    onStart={handleGameStart}
  />
{:else}
  <div class="game-container">
    <div class="game-main">
      <!-- TODO: Game board with player fields -->
      <GameBoard
        gameState={currentGameState}
        currentPlayerId={$currentPlayerid}
      />

      <!-- TODO: Current player's hand -->
      <div class="player-hand-section">
        <PlayerHand
          cards={currentGameState?.players?.find(
            (p: any) => p.id === $currentPlayerid,
          )?.hand || []}
          selectedCardIds={currentUiState?.selectedCards || []}
          playerName="Your"
        />
      </div>
    </div>

    <div class="game-sidebar">
      <!-- TODO: Action panel -->
      <ActionPanel
        isCurrentPlayerTurn={currentGameState?.currentTurnPlayerId ===
          $currentPlayerid}
        hasPlayedCard={currentUiState?.selectedCards?.length > 0}
      />

      <!-- TODO: Game log -->
      <GameLog logs={currentUiState?.gameLog || []} />
    </div>
  </div>

  <!-- TODO: Coin flip modal for Chaos cards -->
  {#if currentUiState?.showCoinFlipModal && currentUiState?.coinFlipCard}
    <CoinFlipModal
      card={currentUiState.coinFlipCard}
      targetPlayerName="opponent"
      onPrediction={(pred) => {
        // TODO: Handle prediction
      }}
      onCancel={() => {
        uiState.update((state) => ({ ...state, showCoinFlipModal: false }));
      }}
    />
  {/if}

  <!-- TODO: Game over modal -->
  {#if $gameOverState?.isGameOver}
    <GameOverModal
      winners={$gameOverState?.winners || []}
      scores={$gameOverState?.scores || {}}
      onPlayAgain={handlePlayAgain}
    />
  {/if}
{/if}

<style>
  .game-container {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 16px;
    padding: 16px;
    min-height: 100vh;
  }

  .game-main {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .player-hand-section {
    border-top: 2px solid #e5e7eb;
    padding-top: 16px;
  }

  .game-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (max-width: 1024px) {
    .game-container {
      grid-template-columns: 1fr;
    }

    .game-sidebar {
      grid-template-columns: 1fr 1fr;
      grid-auto-flow: column;
    }
  }

  @media (max-width: 768px) {
    .game-container {
      padding: 8px;
      gap: 8px;
    }

    .game-sidebar {
      grid-template-columns: 1fr;
    }
  }
</style>
