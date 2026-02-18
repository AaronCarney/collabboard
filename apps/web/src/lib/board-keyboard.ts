import type { ObjectType, BoardObject } from "@/types/board";

export interface KeyHandlerDeps {
  editingId: string | null;
  handleDelete: () => void;
  setSelectedIds: (ids: string[]) => void;
  setActiveTool: (tool: ObjectType | "select") => void;
  objects: BoardObject[];
}

export function createBoardKeyHandler(deps: KeyHandlerDeps): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (deps.editingId) return;

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
  };
}
