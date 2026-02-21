"use client";

import { createContext, useContext } from "react";
import type { ToolType } from "@collabboard/shared";

export interface BoardContextValue {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  selectedIds: Set<string>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  setZoom: (z: number) => void;
  fitToScreen: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteFromClipboard: () => void;
  gridVisible: boolean;
  toggleGrid: () => void;
  readOnly: boolean;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) {
    throw new Error("useBoardContext must be used within a BoardContext.Provider");
  }
  return ctx;
}
