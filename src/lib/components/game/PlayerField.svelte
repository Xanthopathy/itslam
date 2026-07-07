<script lang="ts">
  // src/lib/components/game/PlayerField.svelte
  import type { Sheep } from "$lib/types";
  import SheepComponent from "$lib/components/cards/Sheep.svelte";

  type Props = {
    playerName: string;
    field: Sheep[];
    // Whole-sheep targeting (Wolf, Wheat, ITSLAM effects). Mutually
    // exclusive with onPartClick - GameBoard sets only one at a time
    // depending on what's currently being resolved.
    onSheepClick?: (sheepIndex: number) => void;
    // Single-part targeting (swapSheepPart's targetPartIndex)
    onPartClick?: (sheepIndex: number, partIndex: 0 | 1) => void;
  };

  let { playerName, field, onSheepClick, onPartClick }: Props = $props();
</script>

<div class="flex flex-col gap-2">
  <h3 class="text-sm font-semibold text-gray-700">{playerName}'s Field</h3>
  <div class="flex gap-3 flex-wrap min-h-[6rem]">
    {#each field as sheep, index (index)}
      <SheepComponent
        {sheep}
        size="sm"
        onClick={onSheepClick ? () => onSheepClick(index) : undefined}
        onPartClick={onPartClick
          ? (partIndex) => onPartClick(index, partIndex)
          : undefined}
      />
    {/each}
    {#if field.length === 0}
      <span class="text-gray-400 text-sm italic">No sheep yet</span>
    {/if}
  </div>
</div>
