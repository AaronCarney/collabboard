import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBoardKeyHandler, isTextInputFocused } from "@/lib/board-keyboard";

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

  it("Cmd+K calls onToggleAiBar and prevents default", () => {
    const onToggleAiBar = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete: vi.fn(),
      setSelectedIds: vi.fn(),
      setActiveTool: vi.fn(),
      objects: [],
      onToggleAiBar,
    });
    const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    handler(event);
    expect(onToggleAiBar).toHaveBeenCalledOnce();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("Ctrl+K calls onToggleAiBar and prevents default", () => {
    const onToggleAiBar = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete: vi.fn(),
      setSelectedIds: vi.fn(),
      setActiveTool: vi.fn(),
      objects: [],
      onToggleAiBar,
    });
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    handler(event);
    expect(onToggleAiBar).toHaveBeenCalledOnce();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("Cmd+K is ignored when editing text", () => {
    const onToggleAiBar = vi.fn();
    const handler = createBoardKeyHandler({
      editingId: "some-id",
      handleDelete: vi.fn(),
      setSelectedIds: vi.fn(),
      setActiveTool: vi.fn(),
      objects: [],
      onToggleAiBar,
    });
    handler(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    expect(onToggleAiBar).not.toHaveBeenCalled();
  });

  it("Cmd+K always opens the AI bar (not toggle)", () => {
    let aiBarVisible = false;
    const onToggleAiBar = vi.fn(() => {
      // Simulates the page-level wiring: setAiBarVisible(true)
      aiBarVisible = true;
    });
    const handler = createBoardKeyHandler({
      editingId: null,
      handleDelete: vi.fn(),
      setSelectedIds: vi.fn(),
      setActiveTool: vi.fn(),
      objects: [],
      onToggleAiBar,
    });

    // First press: opens
    handler(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    expect(aiBarVisible).toBe(true);

    // Second press: should still be open (always opens, not toggles)
    handler(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    expect(aiBarVisible).toBe(true);
  });
});

describe("isTextInputFocused", () => {
  let input: HTMLInputElement;

  beforeEach(() => {
    input = document.createElement("input");
    document.body.appendChild(input);
  });

  afterEach(() => {
    input.remove();
  });

  it("returns true when an INPUT element is focused", () => {
    input.focus();
    expect(isTextInputFocused()).toBe(true);
  });

  it("returns true when a TEXTAREA element is focused", () => {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    expect(isTextInputFocused()).toBe(true);

    textarea.remove();
  });

  it("returns false when no text-entry element is focused", () => {
    input.blur();
    expect(isTextInputFocused()).toBe(false);
  });

  it("returns false when a non-input element is focused", () => {
    const div = document.createElement("div");
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();

    expect(isTextInputFocused()).toBe(false);

    div.remove();
  });
});
