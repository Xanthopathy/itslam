<script lang="ts">
  // src/lib/components/modals/CoinFlipModal.svelte
  import type { Card } from "$lib/types";

  let {
    card,
    targetPlayerName,
    onPrediction = null,
    onCancel = null,
  } = $props<{
    card: Card;
    targetPlayerName: string;
    onPrediction?: ((prediction: "heads" | "tails") => void) | null;
    onCancel?: (() => void) | null;
  }>();

  let prediction: "heads" | "tails" | null = null;
  let isFlipping = false;
  let flipResult: "heads" | "tails" | null = null;

  const handlePredict = (pred: "heads" | "tails") => {
    prediction = pred;
    isFlipping = true;

    // TODO: Animate coin flip
    setTimeout(() => {
      flipResult = Math.random() > 0.5 ? "heads" : "tails";
    }, 1500);
  };

  const handleContinue = () => {
    if (prediction) {
      onPrediction?.(prediction);
    }
  };

  // TODO: Show card description/effect
  // TODO: Better coin animation
</script>

<div class="modal-overlay">
  <div class="modal-content coin-flip-modal">
    <h2>🎲 Chaos Card!</h2>
    <p class="card-name">{card.name}</p>

    {#if !isFlipping}
      <p class="predict-text">
        <strong>Predict the coin flip for {targetPlayerName}:</strong>
      </p>
      <div class="prediction-buttons">
        <button
          class="predict-btn heads-btn"
          on:click={() => handlePredict("heads")}
        >
          🪙 Heads
        </button>
        <button
          class="predict-btn tails-btn"
          on:click={() => handlePredict("tails")}
        >
          🪙 Tails
        </button>
      </div>
    {:else if flipResult}
      <div class="flip-result">
        <div class={`coin-result ${flipResult}`}>
          {flipResult === "heads" ? "🪙" : "🪙"}
        </div>
        <p class="result-text">
          You predicted: <strong>{prediction}</strong> | Result:
          <strong>{flipResult}</strong>
        </p>
        <p class={`outcome ${prediction === flipResult ? "win" : "lose"}`}>
          {prediction === flipResult ? "✅ You win!" : "❌ You lose!"}
        </p>
        <button class="continue-btn" on:click={handleContinue}>Continue</button>
      </div>
    {:else}
      <div class="flipping">
        <div class="coin-animation">🪙</div>
        <p>Flipping...</p>
      </div>
    {/if}

    {#if !isFlipping}
      <button class="cancel-btn" on:click={() => onCancel?.()}>Cancel</button>
    {/if}
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 400px;
  }

  .coin-flip-modal h2 {
    margin: 0 0 12px;
    font-size: 28px;
  }

  .card-name {
    font-size: 18px;
    font-weight: bold;
    color: #4f46e5;
    margin: 0 0 24px;
  }

  .predict-text {
    font-size: 14px;
    margin: 0 0 16px;
  }

  .prediction-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 24px 0;
  }

  .predict-btn {
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .predict-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .heads-btn {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .heads-btn:hover {
    background: #eff6ff;
  }

  .tails-btn {
    border-color: #8b5cf6;
    color: #8b5cf6;
  }

  .tails-btn:hover {
    background: #faf5ff;
  }

  .flipping {
    padding: 32px;
  }

  .coin-animation {
    font-size: 64px;
    animation: spin 1s linear infinite;
    margin: 16px 0;
  }

  @keyframes spin {
    0% {
      transform: rotateY(0deg);
    }
    100% {
      transform: rotateY(360deg);
    }
  }

  .flip-result {
    padding: 20px 0;
  }

  .coin-result {
    font-size: 48px;
    margin: 16px 0;
    animation: bounce 0.6s;
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  .result-text {
    margin: 16px 0;
    font-size: 14px;
  }

  .outcome {
    font-size: 16px;
    font-weight: bold;
    margin: 12px 0;
  }

  .outcome.win {
    color: #10b981;
  }

  .outcome.lose {
    color: #ef4444;
  }

  .continue-btn {
    background: #4f46e5;
    color: white;
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 16px;
  }

  .continue-btn:hover {
    background: #4338ca;
  }

  .cancel-btn {
    display: block;
    width: 100%;
    padding: 10px;
    margin-top: 16px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    color: #6b7280;
  }

  .cancel-btn:hover {
    background: #f9fafb;
  }
</style>
