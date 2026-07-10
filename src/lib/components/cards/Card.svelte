<script lang="ts">
  // src/lib/components/cards/Card.svelte
  import type { Card } from "../../types";
  import { getColorClasses, getColorLabel } from "../../utils/colorUtils";

  type Props = {
    card: Card;
    selected?: boolean;
    disabled?: boolean;
    size?: "sm" | "md" | "lg";
    onClick?: (card: Card) => void;
    interactive?: boolean;
  };

  let {
    card,
    selected = false,
    disabled = false,
    size = "md",
    onClick,
    interactive = true,
  }: Props = $props();

  // head/butt cards get their color swatch, everything else gets a fixed per-type look so the hand is easy to scan at a glance
  const isSheepPart = $derived(card.type === "head" || card.type === "butt");

  const TYPE_STYLES: Record<string, string> = {
    action: "bg-slate-700 text-white",
    modifier: "bg-indigo-500 text-white",
    itslam: "bg-yellow-400 text-black",
  };

  const SIZE_CLASSES: Record<string, string> = {
    sm: "w-14 h-20 text-[10px] p-1",
    md: "w-20 h-28 text-[12px] p-2",
    lg: "w-28 h-40 text-[16px] p-3",
  };

  function handleClick() {
    if (disabled) return;
    onClick?.(card);
  }
</script>

{#if interactive}
  <button
    type="button"
    class={[
      "relative flex flex-col justify-between rounded-lg shadow-md transition-transform",
      "font-semibold select-none",
      SIZE_CLASSES[size],
      isSheepPart ? getColorClasses(card.color) : TYPE_STYLES[card.type],
      selected
        ? "ring-4 ring-yellow-300 -translate-y-2"
        : "hover:-translate-y-1",
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
    ].join(" ")}
    onclick={handleClick}
    {disabled}
    aria-pressed={selected}
  >
    <span class="uppercase tracking-wide opacity-80">{card.type}</span>
    <span class="leading-tight">
      {card.name}
      {#if isSheepPart}
        <br />
        <span class="opacity-80">{getColorLabel(card.color)}</span>
      {/if}
    </span>
  </button>
{:else}
  <div
    class={[
      "relative flex flex-col justify-between rounded-lg shadow-md transition-transform",
      "font-semibold select-none",
      SIZE_CLASSES[size],
      isSheepPart ? getColorClasses(card.color) : TYPE_STYLES[card.type],
      selected ? "ring-4 ring-yellow-300 -translate-y-2" : "",
      disabled ? "opacity-50 cursor-not-allowed" : "",
    ].join(" ")}
  >
    <span class="uppercase tracking-wide opacity-80">{card.type}</span>
    <span class="leading-tight">
      {card.name}
      {#if isSheepPart}
        <br />
        <span class="opacity-80">{getColorLabel(card.color)}</span>
      {/if}
    </span>
  </div>
{/if}
