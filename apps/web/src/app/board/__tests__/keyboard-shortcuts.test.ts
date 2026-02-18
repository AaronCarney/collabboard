import { describe, it, expect, vi } from "vitest";
import { createBoardKeyHandler } from "@/lib/board-keyboard";

describe("createBoardKeyHandler", () => {
  it("does not switch tools on v/s/r/c/t or 1-5 keys", () => {
    const setActiveTool = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete: vi.fn(),
      setSelectedIds: vi.fn(),
      setActiveTool,
      objects: [],
    });

    for (const key of ["v", "s", "r", "c", "t", "1", "2", "3", "4", "5"]) {
      handler(new KeyboardEvent("keydown", { key }));
    }

    expect(setActiveTool).not.toHaveBeenCalled();
  });

  it("handles Delete key", () => {
    const handleDelete = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete,
      setSelectedIds: vi.fn(),
      setActiveTool: vi.fn(),
      objects: [],
    });

    handler(new KeyboardEvent("keydown", { key: "Delete" }));
    expect(handleDelete).toHaveBeenCalledOnce();
  });

  it("handles Backspace key", () => {
    const handleDelete = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete,
      setSelectedIds: vi.fn(),
      setActiveTool: vi.fn(),
      objects: [],
    });

    handler(new KeyboardEvent("keydown", { key: "Backspace" }));
    expect(handleDelete).toHaveBeenCalledOnce();
  });

  it("handles Escape key — clears selection", () => {
    const setSelectedIds = vi.fn();
    const setActiveTool = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete: vi.fn(),
      setSelectedIds,
      setActiveTool,
      objects: [],
    });

    handler(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(setSelectedIds).toHaveBeenCalledWith([]);
    expect(setActiveTool).toHaveBeenCalledWith("select");
  });

  it("ignores all keys when editingId is set", () => {
    const handleDelete = vi.fn();
    const setActiveTool = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: "some-id",
      handleDelete,
      setSelectedIds: vi.fn(),
      setActiveTool,
      objects: [],
    });

    handler(new KeyboardEvent("keydown", { key: "Delete" }));
    handler(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handleDelete).not.toHaveBeenCalled();
    expect(setActiveTool).not.toHaveBeenCalled();
  });

  it("Ctrl+A selects all objects", () => {
    const setSelectedIds = vi.fn();
    const objects = [{ id: "obj-1" }, { id: "obj-2" }, { id: "obj-3" }];
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete: vi.fn(),
      setSelectedIds,
      setActiveTool: vi.fn(),
      objects: objects as Parameters<typeof createBoardKeyHandler>[0]["objects"],
    });

    const event = new KeyboardEvent("keydown", { key: "a", ctrlKey: true });
    // Spy on preventDefault
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    handler(event);

    expect(setSelectedIds).toHaveBeenCalledWith(["obj-1", "obj-2", "obj-3"]);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
