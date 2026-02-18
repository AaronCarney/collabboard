import { describe, it, expect, vi } from "vitest";
import { createBoardKeyHandler } from "@/lib/board-keyboard";

describe("createBoardKeyHandler", () => {
  it("does not switch tools on v/s/r/c/t or 1-5 keys", () => {
    const setActiveTool = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete: vi.fn(),
      setSelectedId: vi.fn(),
      setActiveTool,
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
      setSelectedId: vi.fn(),
      setActiveTool: vi.fn(),
    });

    handler(new KeyboardEvent("keydown", { key: "Delete" }));
    expect(handleDelete).toHaveBeenCalledOnce();
  });

  it("handles Backspace key", () => {
    const handleDelete = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete,
      setSelectedId: vi.fn(),
      setActiveTool: vi.fn(),
    });

    handler(new KeyboardEvent("keydown", { key: "Backspace" }));
    expect(handleDelete).toHaveBeenCalledOnce();
  });

  it("handles Escape key", () => {
    const setSelectedId = vi.fn();
    const setActiveTool = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete: vi.fn(),
      setSelectedId,
      setActiveTool,
    });

    handler(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(setSelectedId).toHaveBeenCalledWith(null);
    expect(setActiveTool).toHaveBeenCalledWith("select");
  });

  it("ignores all keys when editingId is set", () => {
    const handleDelete = vi.fn();
    const setActiveTool = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: "some-id",
      handleDelete,
      setSelectedId: vi.fn(),
      setActiveTool,
    });

    handler(new KeyboardEvent("keydown", { key: "Delete" }));
    handler(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handleDelete).not.toHaveBeenCalled();
    expect(setActiveTool).not.toHaveBeenCalled();
  });
});
