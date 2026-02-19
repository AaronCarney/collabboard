import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUndoRedoKeyboard } from "../useUndoRedoKeyboard";

describe("useUndoRedoKeyboard", () => {
  it("calls undo on Ctrl+Z", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => {
      useUndoRedoKeyboard({ undo, redo });
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));

    expect(undo).toHaveBeenCalledOnce();
    expect(redo).not.toHaveBeenCalled();
  });

  it("calls redo on Ctrl+Shift+Z", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => {
      useUndoRedoKeyboard({ undo, redo });
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true }));

    expect(redo).toHaveBeenCalledOnce();
    expect(undo).not.toHaveBeenCalled();
  });

  it("calls redo on Ctrl+Y", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => {
      useUndoRedoKeyboard({ undo, redo });
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "y", ctrlKey: true }));

    expect(redo).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => {
      useUndoRedoKeyboard({ undo, redo, enabled: false });
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));

    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
  });

  it("does not fire when Ctrl is not held", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => {
      useUndoRedoKeyboard({ undo, redo });
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z" }));

    expect(undo).not.toHaveBeenCalled();
  });
});
