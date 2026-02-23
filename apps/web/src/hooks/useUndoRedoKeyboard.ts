"use client";

import { useEffect } from "react";

interface UseUndoRedoKeyboardOptions {
  undo: () => void;
  redo: () => void;
  enabled?: boolean;
}

/**
 * Registers Ctrl+Z (undo) and Ctrl+Y / Ctrl+Shift+Z (redo) keyboard shortcuts.
 * Prevents default browser undo/redo behavior when active.
 */
export function useUndoRedoKeyboard({
  undo,
  redo,
  enabled = true,
}: UseUndoRedoKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === "y") {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo, enabled]);
}
