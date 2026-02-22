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

  describe("drag handle (AC5.1)", () => {
    it("renders a drag handle element", () => {
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={vi.fn()} />);
      const handle = screen.getByTestId("property-panel-drag-handle");
      expect(handle).toBeInTheDocument();
    });
  });

  describe("custom color input (AC5.3)", () => {
    it("renders a hex color input field", () => {
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={vi.fn()} />);
      const hexInput = screen.getByPlaceholderText(/#[0-9a-fA-F]/i);
      expect(hexInput).toBeInTheDocument();
    });

    it("calls onUpdateObjects with valid hex color on Enter", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      const hexInput = screen.getByPlaceholderText(/#[0-9a-fA-F]/i);
      fireEvent.change(hexInput, { target: { value: "#FF5733" } });
      fireEvent.keyDown(hexInput, { key: "Enter" });
      expect(onUpdate).toHaveBeenCalledWith(["obj-1"], { color: "#FF5733" });
    });

    it("does NOT call onUpdateObjects with invalid hex color", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      const hexInput = screen.getByPlaceholderText(/#[0-9a-fA-F]/i);
      fireEvent.change(hexInput, { target: { value: "not-a-color" } });
      fireEvent.keyDown(hexInput, { key: "Enter" });
      expect(onUpdate).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ color: "not-a-color" })
      );
    });
  });

  describe("stroke color (AC5.4)", () => {
    it("renders a Stroke Color section", () => {
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "rectangle" })]}
          onUpdateObjects={vi.fn()}
        />
      );
      expect(screen.getByText(/border/i)).toBeInTheDocument();
    });
  });

  describe("line thickness (AC5.5)", () => {
    it("renders a line thickness control", () => {
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "rectangle" })]}
          onUpdateObjects={vi.fn()}
        />
      );
      expect(screen.getByLabelText(/thickness|line width|stroke width/i)).toBeInTheDocument();
    });

    it("offers thickness options including 1, 2, 3, 5, 8", () => {
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "rectangle" })]}
          onUpdateObjects={vi.fn()}
        />
      );
      for (const thickness of [1, 2, 3, 5, 8]) {
        expect(screen.getByText(new RegExp(`${String(thickness)}\\s*px`))).toBeInTheDocument();
      }
    });
  });

  describe("stroke color swatches (AC5.4)", () => {
    it("renders stroke color swatches with aria-labels", () => {
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "rectangle" })]}
          onUpdateObjects={vi.fn()}
        />
      );
      const strokeButtons = screen.getAllByLabelText(/stroke color/i);
      expect(strokeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("calls onUpdateObjects when a stroke color swatch is clicked", () => {
      const onUpdate = vi.fn();
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "rectangle" })]}
          onUpdateObjects={onUpdate}
        />
      );
      const strokeButtons = screen.getAllByLabelText(/stroke color/i);
      fireEvent.click(strokeButtons[0]);
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe("hex color input — edge cases (AC5.3)", () => {
    it("does NOT apply a 3-digit hex shorthand (#RGB) — only 6-digit hex is valid", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      const hexInput = screen.getByPlaceholderText(/#[0-9a-fA-F]/i);
      fireEvent.change(hexInput, { target: { value: "#F00" } });
      fireEvent.keyDown(hexInput, { key: "Enter" });
      expect(onUpdate).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ color: "#F00" })
      );
    });

    it("does NOT apply color when only Enter with empty input", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      const hexInput = screen.getByPlaceholderText(/#[0-9a-fA-F]/i);
      fireEvent.change(hexInput, { target: { value: "" } });
      fireEvent.keyDown(hexInput, { key: "Enter" });
      expect(onUpdate).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ color: "" })
      );
    });

    it("does NOT apply color on non-Enter key (e.g. Space)", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      const hexInput = screen.getByPlaceholderText(/#[0-9a-fA-F]/i);
      fireEvent.change(hexInput, { target: { value: "#AABBCC" } });
      fireEvent.keyDown(hexInput, { key: " " });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("applies lowercase hex color on Enter", () => {
      const onUpdate = vi.fn();
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={onUpdate} />);
      const hexInput = screen.getByPlaceholderText(/#[0-9a-fA-F]/i);
      fireEvent.change(hexInput, { target: { value: "#aabbcc" } });
      fireEvent.keyDown(hexInput, { key: "Enter" });
      expect(onUpdate).toHaveBeenCalledWith(["obj-1"], { color: "#aabbcc" });
    });
  });

  describe("opacity — boundary values", () => {
    it("shows 0% when opacity is 0", () => {
      render(
        <PropertyPanel selectedObjects={[makeObject({ opacity: 0 })]} onUpdateObjects={vi.fn()} />
      );
      expect(screen.getByText("0%")).toBeDefined();
    });

    it("shows 100% when opacity is 1", () => {
      render(
        <PropertyPanel selectedObjects={[makeObject({ opacity: 1 })]} onUpdateObjects={vi.fn()} />
      );
      expect(screen.getByText("100%")).toBeDefined();
    });

    it("shows 'Mixed' when two objects have different opacity", () => {
      render(
        <PropertyPanel
          selectedObjects={[
            makeObject({ id: "a", opacity: 0.3 }),
            makeObject({ id: "b", opacity: 0.7 }),
          ]}
          onUpdateObjects={vi.fn()}
        />
      );
      expect(screen.getByText("Mixed")).toBeDefined();
    });
  });

  describe("single vs multi-selection header", () => {
    it("shows 'Properties' for a single selection", () => {
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={vi.fn()} />);
      expect(screen.getByText("Properties")).toBeInTheDocument();
    });

    it("shows 'Properties (3 objects)' for three objects", () => {
      render(
        <PropertyPanel
          selectedObjects={[
            makeObject({ id: "a" }),
            makeObject({ id: "b" }),
            makeObject({ id: "c" }),
          ]}
          onUpdateObjects={vi.fn()}
        />
      );
      expect(screen.getByText(/3 objects/)).toBeInTheDocument();
    });
  });

  describe("font controls — no font controls for connector type", () => {
    it("hides font controls for connector objects", () => {
      render(
        <PropertyPanel
          selectedObjects={[makeObject({ type: "connector" })]}
          onUpdateObjects={vi.fn()}
        />
      );
      expect(screen.queryByLabelText("Font Size")).toBeNull();
      expect(screen.queryByLabelText("Font Family")).toBeNull();
    });
  });

  describe("fill label (AC: rename Color to Fill)", () => {
    it("shows 'Fill' label instead of 'Color'", () => {
      render(<PropertyPanel selectedObjects={[makeObject()]} onUpdateObjects={vi.fn()} />);
      expect(screen.getByText("Fill")).toBeInTheDocument();
      expect(screen.queryByText("Color")).not.toBeInTheDocument();
    });
  });
});
