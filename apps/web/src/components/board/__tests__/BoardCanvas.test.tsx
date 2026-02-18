import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { BoardCanvas } from "../BoardCanvas";

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

function defaultProps(overrides: Partial<React.ComponentProps<typeof BoardCanvas>> = {}) {
  return {
    objects: [],
    camera: { x: 0, y: 0, zoom: 1 },
    selectedId: null,
    editingId: null,
    cursors: new Map(),
    activeTool: "select" as const,
    onCanvasClick: vi.fn(),
    onObjectSelect: vi.fn(),
    onObjectMove: vi.fn(),
    onObjectDoubleClick: vi.fn(),
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

    // With a creation tool, mousedown should NOT set isPanning,
    // so mouseup should fire onCanvasClick
    act(() => {
      fireMouseEvent(canvas, "mousedown", { clientX: 200, clientY: 150 });
    });
    act(() => {
      fireMouseEvent(canvas, "mouseup", { clientX: 200, clientY: 150 });
    });

    expect(props.onCanvasClick).toHaveBeenCalledWith(200, 150);
  });

  it("pans when select tool is active and empty space is dragged", () => {
    const props = defaultProps({ activeTool: "select" });
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

    expect(props.onPan).toHaveBeenCalled();
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
});
