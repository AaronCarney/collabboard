import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { BoardCanvas } from "../BoardCanvas";
import type { BoardObject } from "@/types/board";

// Mock canvas getContext since happy-dom doesn't support canvas
const mockContext = {
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
  font: "",
  textAlign: "",
  textBaseline: "",
  shadowColor: "",
  shadowBlur: 0,
  shadowOffsetY: 0,
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  arcTo: vi.fn(),
  ellipse: vi.fn(),
  setLineDash: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
};

HTMLCanvasElement.prototype.getContext = vi.fn(
  () => mockContext
) as unknown as typeof HTMLCanvasElement.prototype.getContext;

function makeBoardObject(overrides: Partial<BoardObject> = {}): BoardObject {
  return {
    id: "obj-1",
    board_id: "board-1",
    type: "sticky_note",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    content: "",
    color: "#FFEB3B",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  } as BoardObject;
}

function defaultProps(overrides: Partial<React.ComponentProps<typeof BoardCanvas>> = {}) {
  return {
    objects: [],
    camera: { x: 0, y: 0, zoom: 1 },
    selectedIds: [] as string[],
    editingId: null,
    cursors: new Map(),
    activeTool: "select" as const,
    isSpaceHeld: false,
    onCanvasClick: vi.fn(),
    onObjectSelect: vi.fn(),
    onObjectClick: vi.fn(),
    onObjectsMove: vi.fn(),
    onObjectDoubleClick: vi.fn(),
    onSelectionBox: vi.fn(),
    onObjectResize: vi.fn(),
    onPan: vi.fn(),
    onZoom: vi.fn(),
    onCursorMove: vi.fn(),
    ...overrides,
  };
}

function fireMouseEvent(el: HTMLElement, type: string, opts: Partial<MouseEventInit> = {}) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 100,
    clientY: 100,
    button: 0,
    ...opts,
  });
  el.dispatchEvent(event);
}

function getCanvas(container: HTMLElement): HTMLCanvasElement {
  const canvas = container.querySelector("canvas");
  if (!canvas) throw new Error("canvas not found");
  return canvas;
}

describe("BoardCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a bounding rect for the canvas
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }));
  });

  it("calls onCanvasClick when creation tool is active and empty space is clicked", () => {
    const props = defaultProps({ activeTool: "sticky_note" });
    const { container } = render(<BoardCanvas {...props} />);
    const canvas = getCanvas(container);

    act(() => {
      fireMouseEvent(canvas, "mousedown", { clientX: 200, clientY: 150 });
    });
    act(() => {
      fireMouseEvent(canvas, "mouseup", { clientX: 200, clientY: 150 });
    });

    expect(props.onCanvasClick).toHaveBeenCalledWith(200, 150);
  });

  it("does not pan when creation tool is active and empty space is clicked", () => {
    const props = defaultProps({ activeTool: "sticky_note" });
    const { container } = render(<BoardCanvas {...props} />);
    const canvas = getCanvas(container);

    act(() => {
      fireMouseEvent(canvas, "mousedown", { clientX: 200, clientY: 150 });
    });
    act(() => {
      fireMouseEvent(canvas, "mousemove", { clientX: 210, clientY: 160 });
    });
    act(() => {
      fireMouseEvent(canvas, "mouseup", { clientX: 210, clientY: 160 });
    });

    expect(props.onPan).not.toHaveBeenCalled();
  });

  // Phase 1: Click-again-to-edit
  describe("click-again-to-edit", () => {
    it("calls onObjectClick when clicking an already-selected object without moving", () => {
      const stickyNote = makeBoardObject({ id: "sticky-1", type: "sticky_note" });
      const props = defaultProps({
        objects: [stickyNote],
        selectedIds: ["sticky-1"],
      });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      // Click on the already-selected object (within its bounds: 100-300, 100-300)
      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 150, clientY: 150 });
      });
      act(() => {
        fireMouseEvent(canvas, "mouseup", { clientX: 150, clientY: 150 });
      });

      expect(props.onObjectClick).toHaveBeenCalledWith("sticky-1");
    });

    it("does NOT call onObjectClick when dragging a selected object", () => {
      const stickyNote = makeBoardObject({ id: "sticky-1", type: "sticky_note" });
      const props = defaultProps({
        objects: [stickyNote],
        selectedIds: ["sticky-1"],
      });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 150, clientY: 150 });
      });
      // Move far enough to be a drag (> 3px)
      act(() => {
        fireMouseEvent(canvas, "mousemove", { clientX: 170, clientY: 170 });
      });
      act(() => {
        fireMouseEvent(canvas, "mouseup", { clientX: 170, clientY: 170 });
      });

      expect(props.onObjectClick).not.toHaveBeenCalled();
    });

    it("does NOT call onObjectClick when clicking a non-selected object", () => {
      const stickyNote = makeBoardObject({ id: "sticky-1", type: "sticky_note" });
      const props = defaultProps({
        objects: [stickyNote],
        selectedIds: [], // not selected
      });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 150, clientY: 150 });
      });
      act(() => {
        fireMouseEvent(canvas, "mouseup", { clientX: 150, clientY: 150 });
      });

      expect(props.onObjectClick).not.toHaveBeenCalled();
      expect(props.onObjectSelect).toHaveBeenCalledWith("sticky-1", false);
    });
  });

  // Phase 1: Placeholder rendering
  describe("placeholder rendering", () => {
    it("renders placeholder text in gray for empty-content sticky note", async () => {
      const stickyNote = makeBoardObject({
        id: "sticky-1",
        type: "sticky_note",
        content: "",
      });
      const props = defaultProps({ objects: [stickyNote] });
      render(<BoardCanvas {...props} />);

      // Trigger the requestAnimationFrame render loop
      await act(async () => {
        await vi.waitFor(() => {
          const fillTextCalls = mockContext.fillText.mock.calls;
          const hasPlaceholder = fillTextCalls.some(
            (call: unknown[]) => typeof call[0] === "string" && call[0].includes("New note")
          );
          expect(hasPlaceholder).toBe(true);
        });
      });
    });

    it("renders actual content instead of placeholder when content is non-empty", async () => {
      const stickyNote = makeBoardObject({
        id: "sticky-1",
        type: "sticky_note",
        content: "My actual note",
      });
      const props = defaultProps({ objects: [stickyNote] });
      render(<BoardCanvas {...props} />);

      await act(async () => {
        await vi.waitFor(() => {
          const fillTextCalls = mockContext.fillText.mock.calls;
          const hasActualContent = fillTextCalls.some(
            (call: unknown[]) => typeof call[0] === "string" && call[0].includes("My actual note")
          );
          expect(hasActualContent).toBe(true);
        });
      });

      // Verify no placeholder text was rendered
      const allFillTextCalls = mockContext.fillText.mock.calls;
      const hasPlaceholder = allFillTextCalls.some(
        (call: unknown[]) => typeof call[0] === "string" && call[0] === "New note"
      );
      expect(hasPlaceholder).toBe(false);
    });
  });

  // Phase 2: Space+drag pan
  describe("Space+drag pan", () => {
    it("does NOT pan when dragging empty space without Space held", () => {
      const props = defaultProps({ activeTool: "select", isSpaceHeld: false });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 400, clientY: 300 });
      });
      act(() => {
        fireMouseEvent(canvas, "mousemove", { clientX: 420, clientY: 320 });
      });
      act(() => {
        fireMouseEvent(canvas, "mouseup", { clientX: 420, clientY: 320 });
      });

      expect(props.onPan).not.toHaveBeenCalled();
    });

    it("pans when dragging with Space held", () => {
      const props = defaultProps({ activeTool: "select", isSpaceHeld: true });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 400, clientY: 300 });
      });
      act(() => {
        fireMouseEvent(canvas, "mousemove", { clientX: 420, clientY: 320 });
      });
      act(() => {
        fireMouseEvent(canvas, "mouseup", { clientX: 420, clientY: 320 });
      });

      expect(props.onPan).toHaveBeenCalled();
    });

    it("pans with middle mouse regardless of Space", () => {
      const props = defaultProps({ activeTool: "select", isSpaceHeld: false });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 400, clientY: 300, button: 1 });
      });
      act(() => {
        fireMouseEvent(canvas, "mousemove", { clientX: 420, clientY: 320 });
      });
      act(() => {
        fireMouseEvent(canvas, "mouseup", { clientX: 420, clientY: 320 });
      });

      expect(props.onPan).toHaveBeenCalled();
    });
  });

  // Phase 3: Multi-select
  describe("multi-select", () => {
    it("passes additive=true when Shift+clicking an object", () => {
      const obj = makeBoardObject({ id: "obj-1" });
      const props = defaultProps({ objects: [obj] });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      act(() => {
        fireMouseEvent(canvas, "mousedown", {
          clientX: 150,
          clientY: 150,
          shiftKey: true,
        } as MouseEventInit);
      });

      expect(props.onObjectSelect).toHaveBeenCalledWith("obj-1", true);
    });

    it("starts rubber-band selection on empty space drag without Space", () => {
      const props = defaultProps({ activeTool: "select", isSpaceHeld: false });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 400, clientY: 300 });
      });
      act(() => {
        fireMouseEvent(canvas, "mousemove", { clientX: 500, clientY: 400 });
      });
      act(() => {
        fireMouseEvent(canvas, "mouseup", { clientX: 500, clientY: 400 });
      });

      expect(props.onSelectionBox).toHaveBeenCalled();
      expect(props.onPan).not.toHaveBeenCalled();
    });
  });

  // Phase 5: Multi-drag
  describe("multi-drag", () => {
    it("calls onObjectsMove with all selected objects when dragging one", () => {
      const obj1 = makeBoardObject({ id: "obj-1", x: 100, y: 100, width: 200, height: 200 });
      const obj2 = makeBoardObject({ id: "obj-2", x: 400, y: 400, width: 200, height: 200 });
      const props = defaultProps({
        objects: [obj1, obj2],
        selectedIds: ["obj-1", "obj-2"],
      });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      // Mousedown on obj-1 (within 100-300, 100-300)
      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 150, clientY: 150 });
      });
      // Drag 20px right, 10px down (exceeds CLICK_THRESHOLD of 3)
      act(() => {
        fireMouseEvent(canvas, "mousemove", { clientX: 170, clientY: 160 });
      });

      // onObjectsMove should be called with moves for BOTH selected objects
      expect(props.onObjectsMove).toHaveBeenCalled();
      const moves = props.onObjectsMove.mock.calls[0][0] as {
        id: string;
        x: number;
        y: number;
      }[];
      expect(moves).toHaveLength(2);
      const moveIds = moves.map((m: { id: string }) => m.id).sort();
      expect(moveIds).toEqual(["obj-1", "obj-2"]);
    });

    it("moves all selected objects by the same delta", () => {
      const obj1 = makeBoardObject({ id: "obj-1", x: 100, y: 100, width: 200, height: 200 });
      const obj2 = makeBoardObject({ id: "obj-2", x: 400, y: 400, width: 200, height: 200 });
      const props = defaultProps({
        objects: [obj1, obj2],
        selectedIds: ["obj-1", "obj-2"],
      });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      // Mousedown on obj-1
      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 150, clientY: 150 });
      });
      // Drag 20px right, 10px down (zoom=1, so screen delta = world delta)
      act(() => {
        fireMouseEvent(canvas, "mousemove", { clientX: 170, clientY: 160 });
      });

      const moves = props.onObjectsMove.mock.calls[0][0] as {
        id: string;
        x: number;
        y: number;
      }[];
      const move1 = moves.find((m: { id: string }) => m.id === "obj-1");
      const move2 = moves.find((m: { id: string }) => m.id === "obj-2");

      // obj-1 starts at (100, 100), delta is (20, 10) → (120, 110)
      expect(move1?.x).toBe(120);
      expect(move1?.y).toBe(110);
      // obj-2 starts at (400, 400), same delta → (420, 410)
      expect(move2?.x).toBe(420);
      expect(move2?.y).toBe(410);
    });
  });

  // Phase 4: Resize handles
  describe("resize handles", () => {
    it("calls onObjectResize when dragging a handle", () => {
      const rect = makeBoardObject({
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      });
      const props = defaultProps({
        objects: [rect],
        selectedIds: ["rect-1"],
      });
      const { container } = render(<BoardCanvas {...props} />);
      const canvas = getCanvas(container);

      // Click on the SE handle (bottom-right corner: x=300, y=250)
      act(() => {
        fireMouseEvent(canvas, "mousedown", { clientX: 300, clientY: 250 });
      });
      act(() => {
        fireMouseEvent(canvas, "mousemove", { clientX: 350, clientY: 300 });
      });
      act(() => {
        fireMouseEvent(canvas, "mouseup", { clientX: 350, clientY: 300 });
      });

      expect(props.onObjectResize).toHaveBeenCalled();
    });
  });
});
