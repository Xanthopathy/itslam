<script lang="ts">
  // src/lib/components/modals/LobbyModal.svelte
  let {
    playerCount = 2,
    playerNames = ["", ""],
    onStart = null,
  } = $props<{
    playerCount?: number;
    playerNames?: string[];
    onStart?: ((names: string[]) => void) | null;
  }>();

  const minPlayers = 2;
  const maxPlayers = 4;

  const handlePlayerCountChange = (count: number) => {
    playerCount = Math.max(minPlayers, Math.min(maxPlayers, count));
    // Adjust playerNames array
    if (playerNames.length < playerCount) {
      playerNames = [
        ...playerNames,
        ...Array(playerCount - playerNames.length).fill(""),
      ];
    } else if (playerNames.length > playerCount) {
      playerNames = playerNames.slice(0, playerCount);
    }
  };

  const handleStart = () => {
    // Validate names
    const validNames = playerNames
      .slice(0, playerCount)
      .filter((n) => n.trim());
    if (validNames.length === playerCount) {
      onStart?.(validNames);
    }
  };

  const isFormValid = () => {
    return playerNames.slice(0, playerCount).every((n) => n.trim().length > 0);
  };

  // TODO: Show rules/how to play
</script>

<div class="modal-overlay">
  <div class="modal-content lobby-modal">
    <h1>🐑 ITSLAM</h1>
    <p class="tagline">A chaotic sheep card game</p>

    <div class="form-section">
      <label for="player-count">Number of Players:</label>
      <div class="player-count-selector">
        <button on:click={() => handlePlayerCountChange(playerCount - 1)}
          >−</button
        >
        <span>{playerCount}</span>
        <button on:click={() => handlePlayerCountChange(playerCount + 1)}
          >+</button
        >
      </div>
    </div>

    <div class="form-section">
      <label>Player Names:</label>
      <div class="player-names-input">
        {#each Array(playerCount) as _, i}
          <input
            type="text"
            placeholder="Player {i + 1}"
            bind:value={playerNames[i]}
            maxlength="15"
            class={playerNames[i].trim() ? "filled" : ""}
          />
        {/each}
      </div>
    </div>

    <button
      class="start-btn"
      on:click={handleStart}
      disabled={!isFormValid()}
      title={isFormValid() ? "Start the game!" : "Enter all player names first"}
    >
      Start Game
    </button>

    <div class="rules-hint">
      <small
        >Remember: Each player must proudly baa like a sheep to end their turn!
        🐑</small
      >
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    text-align: center;
  }

  .lobby-modal h1 {
    margin: 0 0 8px;
    font-size: 48px;
  }

  .tagline {
    margin: 0 0 32px;
    color: #6b7280;
    font-size: 14px;
  }

  .form-section {
    text-align: left;
    margin-bottom: 24px;
  }

  .form-section label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .player-count-selector {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
  }

  .player-count-selector button {
    width: 40px;
    height: 40px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 18px;
    font-weight: bold;
  }

  .player-count-selector button:hover {
    background: #f3f4f6;
  }

  .player-count-selector span {
    font-weight: bold;
    min-width: 30px;
    text-align: center;
  }

  .player-names-input {
    display: grid;
    gap: 8px;
  }

  .player-names-input input {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: all 0.2s;
  }

  .player-names-input input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .player-names-input input.filled {
    border-color: #10b981;
  }

  .start-btn {
    width: 100%;
    padding: 12px;
    margin-top: 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .start-btn:hover:not(:disabled) {
    background: #5568d3;
    transform: translateY(-2px);
  }

  .start-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .rules-hint {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    color: #6b7280;
  }
</style>
