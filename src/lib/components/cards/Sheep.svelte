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
    // Only set by a parent that's actively resolving a Wolf/Wheat play
    // Not computed here, and not shown by default
    protectedFrom?: "wolf" | "wheat" | null;
  };

  let { sheep, size = "md", onClick, protectedFrom = null }: Props = $props();

  const [partA, partB] = $derived(sheep.parts);

  const isValid = $derived(isValidSheep(sheep));
  const label = $derived(describeSheep(sheep));
  const points = $derived(calculateSheepValue(sheep));
</script>

<button
  type="button"
  class={[
    "relative flex flex-col items-center gap-1 rounded-xl p-2",
    isValid ? "bg-white/60" : "bg-red-100 ring-2 ring-red-400",
    onClick ? "cursor-pointer hover:-translate-y-1 transition-transform" : "",
  ].join(" ")}
  onclick={() => onClick?.(sheep)}
  disabled={!onClick}
  title={label}
>
  <!-- the two parts, side by side -->
  <div class="flex gap-1">
    <Card card={partA} {size} />
    <Card card={partB} {size} />
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

  <!-- protection badge: ONLY rendered when a parent is actively resolving Wolf/Wheat and passes this in. Never shown otherwise. -->
  {#if protectedFrom}
    <span
      class="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 text-white text-[10px] px-2 py-0.5 shadow whitespace-nowrap"
    >
      Protected from {protectedFrom}
    </span>
  {/if}
</button>
