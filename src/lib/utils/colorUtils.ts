// src/lib/utils/colorUtils.ts
import type { CardColor } from "$lib/types";

/**
 * Tailwind background + text classes per color
 * Text color flips to white/black depending on how dark the bg is, so labels stay readable on every swatch.
 */
const COLOR_CLASSES: Record<CardColor, string> = {
  white: "bg-white text-black border border-gray-300",
  orange: "bg-orange-500 text-black",
  magenta: "bg-fuchsia-500 text-white",
  cyan: "bg-cyan-400 text-black",
  beige: "bg-amber-100 text-black border border-amber-200",
  yellow: "bg-yellow-400 text-black",
  lime: "bg-lime-400 text-black",
  pink: "bg-pink-400 text-black",
  gray: "bg-gray-400 text-black",
  brown: "bg-amber-800 text-white",
  mint: "bg-emerald-300 text-black",
  purple: "bg-purple-500 text-white",
  blue: "bg-blue-500 text-white",
  green: "bg-green-600 text-white",
  red: "bg-red-500 text-white",
  black: "bg-black text-white",
  rainbow:
    "bg-gradient-to-br from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-500 text-white",
};

/** Human-readable label, e.g. "Rainbow", "Mint" */
const COLOR_LABELS: Record<CardColor, string> = {
  white: "White",
  orange: "Orange",
  magenta: "Magenta",
  cyan: "Cyan",
  beige: "Beige",
  yellow: "Yellow",
  lime: "Lime",
  pink: "Pink",
  gray: "Gray",
  brown: "Brown",
  mint: "Mint",
  purple: "Purple",
  blue: "Blue",
  green: "Green",
  red: "Red",
  black: "Black",
  rainbow: "Rainbow",
};

export function getColorClasses(color?: CardColor): string {
  if (!color) return COLOR_CLASSES.white;
  return COLOR_CLASSES[color];
}

export function getColorLabel(color?: CardColor): string {
  if (!color) return COLOR_LABELS.white;
  return COLOR_LABELS[color];
}

/**
 * Two colors are considered a match if either is rainbow, or if they are the same color.
 */
export function colorsMatch(a?: CardColor, b?: CardColor): boolean {
  if (!a || !b) return false;
  return a === "rainbow" || b === "rainbow" || a === b;
}
