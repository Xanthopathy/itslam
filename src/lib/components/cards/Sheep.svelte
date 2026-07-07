<script lang="ts">
  // src/lib/components/cards/Sheep.svelte
  import type { Sheep } from "$lib/types";
  import Card from "./Card.svelte";
  import {
    calculateSheepValue,
    isValidSheep,
    describeSheep,
  } from "$lib/game/sheep";

  type Props = {
    sheep: Sheep;
    size?: "sm" | "md" | "lg";
    onClick?: (sheep: Sheep) => void;
    // Set instead of onClick when targeting a single part (e.g. swapSheepPart's
    // targetPartIndex). Mutually exclusive with onClick in practice — a given
    // interaction is either "pick a sheep" or "pick a part," never both.
    onPartClick?: (partIndex: 0 | 1) => void;
    // Only set by a parent that's actively resolving a Wolf/Wheat play —
    // NOT computed here, and NOT shown by default.
    protectedFrom?: "wolf" | "wheat" | null;
  };

  let {
    sheep,
    size = "md",
    onClick,
    onPartClick,
    protectedFrom = null,
  }: Props = $props();

  const [partA, partB] = $derived(sheep.parts);

  const isValid = $derived(isValidSheep(sheep));
  const label = $derived(describeSheep(sheep));
  const points = $derived(calculateSheepValue(sheep));
</script>

{#if onClick && !onPartClick}
  <button
    type="button"
    class={[
      "relative flex flex-col items-center gap-1 rounded-xl p-2",
      isValid ? "bg-white/60" : "bg-red-100 ring-2 ring-red-400",
      "cursor-pointer hover:-translate-y-1 transition-transform",
    ].join(" ")}
    onclick={() => onClick(sheep)}
    title={label}
  >
    <!-- the two parts, side by side.
         In this mode the whole sheep is the clickable target, so the child
         cards stay display-only. -->
    <div class="flex gap-1">
      <Card card={partA} {size} interactive={false} />
      <Card card={partB} {size} interactive={false} />
    </div>

    <!-- modifier badge, only if one is attached -->
    {#if sheep.modifier}
      <span
        class="absolute -top-2 -left-2 rounded-full bg-indigo-500 text-white text-[10px] px-2 py-0.5 shadow"
      >
        {sheep.modifier.name}
      </span>
    {/if}

    <!-- point value -->
    <span
      class="absolute -top-2 -right-2 rounded-full bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center shadow"
    >
      {points}
    </span>

    <!-- protection badge: ONLY rendered when a parent is actively
         resolving Wolf/Wheat and passes this in. Never shown otherwise. -->
    {#if protectedFrom}
      <span
        class="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 text-white text-[10px] px-2 py-0.5 shadow whitespace-nowrap"
      >
        Protected from {protectedFrom}
      </span>
    {/if}
  </button>
{:else}
  <div
    class={[
      "relative flex flex-col items-center gap-1 rounded-xl p-2",
      isValid ? "bg-white/60" : "bg-red-100 ring-2 ring-red-400",
      onPartClick ? "" : "",
    ].join(" ")}
    role="group"
    title={label}
  >
    <!-- the two parts, side by side.
         In part-targeting mode (onPartClick set), each Card is individually
         clickable and the whole-sheep onClick above is expected to be unset. -->
    <div class="flex gap-1">
      <Card
        card={partA}
        {size}
        interactive={Boolean(onPartClick)}
        onClick={onPartClick ? () => onPartClick(0) : undefined}
      />
      <Card
        card={partB}
        {size}
        interactive={Boolean(onPartClick)}
        onClick={onPartClick ? () => onPartClick(1) : undefined}
      />
    </div>

    <!-- modifier badge, only if one is attached -->
    {#if sheep.modifier}
      <span
        class="absolute -top-2 -left-2 rounded-full bg-indigo-500 text-white text-[10px] px-2 py-0.5 shadow"
      >
        {sheep.modifier.name}
      </span>
    {/if}

    <!-- point value -->
    <span
      class="absolute -top-2 -right-2 rounded-full bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center shadow"
    >
      {points}
    </span>

    <!-- protection badge: ONLY rendered when a parent is actively
         resolving Wolf/Wheat and passes this in. Never shown otherwise. -->
    {#if protectedFrom}
      <span
        class="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 text-white text-[10px] px-2 py-0.5 shadow whitespace-nowrap"
      >
        Protected from {protectedFrom}
      </span>
    {/if}
  </div>
{/if}
