// src/lib/utils/colorUtils.ts

/**
 * Get CSS color for sheep part
 */
export const getColorForSheep = (color: string | undefined): string => {
  // TODO: Implement
  const colorMap: Record<string, string> = {
    white: "#ffffff",
    orange: "#f97316",
    magenta: "#ec4899",
    cyan: "#06b6d4",
    beige: "#fef3c7",
    yellow: "#fbbf24",
    lime: "#84cc16",
    pink: "#f472b6",
    gray: "#9ca3af",
    brown: "#92400e",
    mint: "#a7f3d0",
    purple: "#d8b4fe",
    blue: "#3b82f6",
    green: "#22c55e",
    red: "#ef4444",
    black: "#1f2937",
    rainbow:
      "linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet)",
  };

  return colorMap[color || "gray"] || "#999999";
};

/**
 * Get text color for contrast
 */
export const getContrastText = (backgroundColor: string): string => {
  // TODO: Implement
  return "#000000";
};
