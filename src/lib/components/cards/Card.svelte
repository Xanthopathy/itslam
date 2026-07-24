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

  const ICON_CLASSES: Record<string, string> = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
  };

  function getCardIcon(card: Card) {
    if (card.type === "head") return "🐑";
    if (card.type === "butt") return "🍑";

    switch (card.type) {
      case "modifier":
        if (card.name === "Paint") return "🎨";
        if (card.name === "Franken") return "⚡";
        return "🧩";
      case "action":
        switch (card.name) {
          case "Wheat":
            return "🌾";
          case "Wolf":
            return "🐺";
          case "Yoink":
            return "🤏";
          case "ReFlip":
            return "🔁";
          default:
            return "🎯";
        }
      case "itslam":
        switch (card.name) {
          case "Lure 2 Sheep":
            return "🧲";
          case "Remove 2 Sheep":
            return "🗑️";
          case "Yoink Entire Hand":
            return "👐";
          case "Halve 2 Sheep":
            return "✂️";
          case "Recover 1 Sheep":
            return "♻️";
          default:
            return "🎲";
        }
      default:
        return "❓";
    }
  }

  function handleClick() {
    if (disabled) return;
    onClick?.(card);
  }
</script>

{#if interactive}
  <button
    type="button"
    class={[
      "relative flex flex-col items-center justify-between gap-2 rounded-lg shadow-md transition-transform",
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
    <span
      class={[
        "flex flex-1 h-full items-center justify-center leading-none",
        ICON_CLASSES[size],
      ].join(" ")}>{getCardIcon(card)}</span
    >
    <span class="leading-tight uppercase text-center">
      {#if isSheepPart}
        <span class="opacity-80">{getColorLabel(card.color)}</span>
      {:else}
        {card.name}
      {/if}
    </span>
  </button>
{:else}
  <div
    class={[
      "relative flex flex-col items-center justify-between gap-2 rounded-lg shadow-md transition-transform",
      "font-semibold select-none",
      SIZE_CLASSES[size],
      isSheepPart ? getColorClasses(card.color) : TYPE_STYLES[card.type],
      selected ? "ring-4 ring-yellow-300 -translate-y-2" : "",
      disabled ? "opacity-50 cursor-not-allowed" : "",
    ].join(" ")}
  >
    <span class="uppercase tracking-wide opacity-80">{card.type}</span>
    <span
      class={[
        "flex flex-1 h-full items-center justify-center leading-none",
        ICON_CLASSES[size],
      ].join(" ")}>{getCardIcon(card)}</span
    >
    <span class="leading-tight uppercase text-center">
      {#if isSheepPart}
        <span class="opacity-80">{getColorLabel(card.color)}</span>
      {:else}
        {card.name}
      {/if}
    </span>
  </div>
{/if}
