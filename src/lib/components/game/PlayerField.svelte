<script lang="ts">
  // src/lib/components/game/PlayerField.svelte
  import type { Sheep } from "../../types";
  import SheepComponent from "../cards/Sheep.svelte";

  type Props = {
    playerName: string;
    field: Sheep[];
    handSize?: number;
    isActive?: boolean;
    isLocalPlayer?: boolean;
    // Whole-sheep targeting (Wolf, Wheat, ITSLAM effects). Mutually exclusive with onPartClick - GameBoard sets only one at a time depending on what's currently being resolved.
    onSheepClick?: (sheepIndex: number) => void;
    // Single-part targeting (swapSheepPart's targetPartIndex)
    onPartClick?: (sheepIndex: number, partIndex: 0 | 1) => void;
    // Player-level targeting (Yoink, most ITSLAM cards) - clicking the player's name/header rather than any specific sheep.
    onSelectAsTarget?: () => void;
  };

  let {
    playerName,
    field,
    handSize = 0,
    isActive = false,
    isLocalPlayer = false,
    onSheepClick,
    onPartClick,
    onSelectAsTarget,
  }: Props = $props();

  const displayName = $derived(playerName === "You" ? "You" : playerName);
  const fieldLabel = $derived(
    playerName === "You" ? "Your Field" : `${playerName}'s Field`,
  );
  const targetFieldLabel = $derived(
    playerName === "You"
      ? "Your Field (click to target)"
      : `${playerName}'s Field (click to target)`,
  );
  const avatar = $derived(isLocalPlayer ? "🧑" : "🐑");
  let hoverPreview = $state(false);

  function handleSelect() {
    if (onSelectAsTarget) {
      onSelectAsTarget();
    }
  }
</script>

<div
  class="relative flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-sm transition-all"
>
  {#if onSelectAsTarget}
    <button
      type="button"
      class={`absolute inset-0 z-10 rounded-2xl border-2 transition-all ${hoverPreview ? "border-blue-400 bg-blue-500/10" : "border-transparent bg-transparent"}`}
      onclick={handleSelect}
      onmouseenter={() => {
        hoverPreview = true;
      }}
      onmouseleave={() => {
        hoverPreview = false;
      }}
      aria-label={`Select ${displayName} as target`}
    >
      <span class="sr-only">Select {displayName} as target</span>
      {#if hoverPreview}
        <span
          class="absolute bottom-3 right-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow"
        >
          Target this player
        </span>
      {/if}
    </button>
  {/if}
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <div
        class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg"
      >
        {avatar}
      </div>
      <div class="min-w-0">
        {#if onSelectAsTarget}
          <button
            type="button"
            class="text-left text-sm font-semibold text-gray-800 underline decoration-dashed underline-offset-2 hover:text-blue-600"
            onclick={onSelectAsTarget}
          >
            {targetFieldLabel}
          </button>
        {:else}
          <div class="text-sm font-semibold text-gray-800">{displayName}</div>
        {/if}
        <div class="text-xs text-gray-500">
          {isLocalPlayer ? "Local player" : "Opponent"}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <span
        class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
      >
        Hand {handSize}
      </span>
      {#if isActive}
        <span
          class="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
        >
          Turn
        </span>
      {/if}
    </div>
  </div>

  <div class="flex gap-3 flex-wrap min-h-24">
    {#each field as sheep, index (index)}
      <div class="rounded-2xl border-4 border-gray-700 bg-gray-500 shadow-sm">
        <SheepComponent
          {sheep}
          size="sm"
          onClick={onSheepClick ? () => onSheepClick(index) : undefined}
          onPartClick={onPartClick
            ? (partIndex) => onPartClick(index, partIndex)
            : undefined}
        />
      </div>
    {/each}
    {#if field.length === 0}
      <span class="text-gray-400 text-sm italic">No sheep yet</span>
    {/if}
  </div>
</div>
