import type { ObjectType } from "@/types/board";

export interface KeyHandlerDeps {
  editingId: string | null;
  handleDelete: () => void;
  setSelectedId: (id: string | null) => void;
  setActiveTool: (tool: ObjectType | "select") => void;
}

export function createBoardKeyHandler(deps: KeyHandlerDeps): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (deps.editingId) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      deps.handleDelete();
    }
    if (e.key === "Escape") {
      deps.setSelectedId(null);
      deps.setActiveTool("select");
    }
  };
}
