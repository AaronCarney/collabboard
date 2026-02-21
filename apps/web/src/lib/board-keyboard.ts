import type { BoardObject } from "@/types/board";
import type { ToolType } from "@collabboard/shared";

export interface KeyHandlerDeps {
  editingId: string | null;
  handleDelete: () => void;
  setSelectedIds: (ids: string[]) => void;
  setActiveTool: (tool: ToolType) => void;
  objects: BoardObject[];
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onToggleAiBar?: () => void;
}

/** Returns true when a text-entry element (INPUT or TEXTAREA) has focus. */
export function isTextInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}

export function createBoardKeyHandler(deps: KeyHandlerDeps): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (deps.editingId) return;
    if (isTextInputFocused()) return;

    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      deps.onToggleAiBar?.();
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      deps.handleDelete();
    }
    if (e.key === "Escape") {
      deps.setSelectedIds([]);
      deps.setActiveTool("select");
    }
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      deps.setSelectedIds(deps.objects.map((o) => o.id));
    }
    if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      deps.onCopy?.();
    }
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      deps.onPaste?.();
    }
    if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      deps.onDuplicate?.();
    }
  };
}
