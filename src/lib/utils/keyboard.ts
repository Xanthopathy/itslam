// src/lib/utils/keyboard.ts

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
};

/**
 * Setup keyboard shortcuts for the game
 * D = Draw card
 * P = Play card
 * E = End turn
 * ? = Show help
 */
export const setupKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  // TODO: Implement keyboard event listeners
  const handleKeyDown = (event: KeyboardEvent) => {
    // TODO: Match event to shortcuts and trigger callbacks
  };

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }
};

export const commonShortcuts = {
  DRAW_CARD: "d",
  PLAY_CARD: "p",
  END_TURN: "e",
  HELP: "?",
};
