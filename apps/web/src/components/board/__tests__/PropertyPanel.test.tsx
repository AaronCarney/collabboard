import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PropertyPanel } from "../PropertyPanel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeObject(overrides: Record<string, any> = {}): BoardObject {
  return {
    id: "obj-1",
    board_id: "board-1",
    type: "sticky_note",
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    content: "Hello",
    color: "#FFEB3B",
    opacity: 1,
    fontSize: 16,
    fontFamily: "sans-serif",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  } as BoardObject;
}

describe("PropertyPanel", () => {
  describe("color swatches", () => {
    it("renders color swatch buttons", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      // 10 color swatches exist
      const buttons = screen.getAllByRole("button");
      const colorButtons = buttons.filter((b) => b.getAttribute("title")?.startsWith("#"));
      expect(colorButtons.length).toBeGreaterThanOrEqual(10);
    });

    it("highlights the current color", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ color: "#FF9800" })]}
          onUpdateObjects={onUpdate}
        />
      );
      const orangeButton = screen.getByTitle("#FF9800");
      expect(orangeButton.className).toContain("border-gray-800");
    });

    it("calls onUpdateObjects when a color is clicked", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      fireEvent.click(screen.getByTitle("#F44336"));
      expect(onUpdate).toHaveBeenCalledWith(["obj-1"], { color: "#F44336" });
    });
  });

  describe("opacity slider", () => {
    it("renders an opacity slider", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      const slider = screen.getByLabelText("Opacity");
      expect(slider).toBeDefined();
      expect(slider.getAttribute("type")).toBe("range");
    });

    it("displays current opacity value", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ opacity: 0.5 })]}
          onUpdateObjects={onUpdate}
        />
      );
      expect(screen.getByText("50%")).toBeDefined();
    });

    it("calls onUpdateObjects when opacity changes", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      const slider = screen.getByLabelText("Opacity");
      fireEvent.change(slider, { target: { value: "0.7" } });
      expect(onUpdate).toHaveBeenCalledWith(["obj-1"], { opacity: 0.7 });
    });
  });

  describe("font controls", () => {
    it("shows font controls for text objects", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "text" })]}
          onUpdateObjects={onUpdate}
        />
      );
      expect(screen.getByLabelText("Font Size")).toBeDefined();
      expect(screen.getByLabelText("Font Family")).toBeDefined();
    });

    it("shows font controls for sticky_note objects", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "sticky_note" })]}
          onUpdateObjects={onUpdate}
        />
      );
      expect(screen.getByLabelText("Font Size")).toBeDefined();
    });

    it("hides font controls for non-text objects", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "rectangle" })]}
          onUpdateObjects={onUpdate}
        />
      );
      expect(screen.queryByLabelText("Font Size")).toBeNull();
      expect(screen.queryByLabelText("Font Family")).toBeNull();
    });

    it("updates font size when changed", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "text" })]}
          onUpdateObjects={onUpdate}
        />
      );
      const select = screen.getByLabelText("Font Size");
      fireEvent.change(select, { target: { value: "24" } });
      expect(onUpdate).toHaveBeenCalledWith(["obj-1"], { fontSize: 24 });
    });

    it("updates font family when changed", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "text" })]}
          onUpdateObjects={onUpdate}
        />
      );
      const select = screen.getByLabelText("Font Family");
      fireEvent.change(select, { target: { value: "monospace" } });
      expect(onUpdate).toHaveBeenCalledWith(["obj-1"], { fontFamily: "monospace" });
    });
  });

  describe("multiple objects", () => {
    it("shows mixed indicator when objects have different colors", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[
            makeObject({ id: "a", color: "#FFEB3B" }),
            makeObject({ id: "b", color: "#F44336" }),
          ]}
          onUpdateObjects={onUpdate}
        />
      );
      expect(screen.getByText("Mixed colors")).toBeDefined();
    });

    it("shows object count in header", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ id: "a" }), makeObject({ id: "b" })]}
          onUpdateObjects={onUpdate}
        />
      );
      expect(screen.getByText(/2 objects/)).toBeDefined();
    });

    it("applies changes to all selected objects", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ id: "a" }), makeObject({ id: "b" })]}
          onUpdateObjects={onUpdate}
        />
      );
      fireEvent.click(screen.getByTitle("#F44336"));
      expect(onUpdate).toHaveBeenCalledWith(["a", "b"], { color: "#F44336" });
    });
  });
});
