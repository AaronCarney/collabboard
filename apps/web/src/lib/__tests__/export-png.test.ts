import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BoardObject } from "@collabboard/shared";

// We'll import from the module that will be created
import { exportBoardAsPng, computeBoardBounds } from "../export-png";

function createMockObject(overrides: Partial<BoardObject>): BoardObject {
  return {
    id: "obj-1",
    board_id: "board-1",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 200,
    height: 150,
    rotation: 0,
    content: "",
    color: "#42A5F5",
    opacity: 1,
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  } as BoardObject;
}

describe("computeBoardBounds", () => {
  it("computes bounding box covering all objects with padding", () => {
    const objects = [
      createMockObject({ x: 100, y: 100, width: 200, height: 150 }),
      createMockObject({ id: "obj-2", x: 500, y: 300, width: 100, height: 100 }),
    ];
    const bounds = computeBoardBounds(objects);
    // Should encompass from (100,100) to (600,400) plus padding
    expect(bounds.x).toBeLessThanOrEqual(100);
    expect(bounds.y).toBeLessThanOrEqual(100);
    expect(bounds.x + bounds.width).toBeGreaterThanOrEqual(600);
    expect(bounds.y + bounds.height).toBeGreaterThanOrEqual(400);
  });

  it("returns zero-size bounds for empty object array", () => {
    const bounds = computeBoardBounds([]);
    expect(bounds.width).toBe(0);
    expect(bounds.height).toBe(0);
  });

  it("returns zero position for empty object array", () => {
    const bounds = computeBoardBounds([]);
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
  });

  it("handles single object", () => {
    const objects = [createMockObject({ x: 50, y: 50, width: 100, height: 80 })];
    const bounds = computeBoardBounds(objects);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });

  it("handles objects with negative coordinates", () => {
    const objects = [
      createMockObject({ x: -300, y: -200, width: 100, height: 80 }),
      createMockObject({ id: "obj-2", x: 100, y: 100, width: 200, height: 150 }),
    ];
    const bounds = computeBoardBounds(objects);
    // minX=-300, minY=-200, maxX=300, maxY=250
    expect(bounds.x).toBeLessThanOrEqual(-300);
    expect(bounds.y).toBeLessThanOrEqual(-200);
    expect(bounds.x + bounds.width).toBeGreaterThanOrEqual(300);
    expect(bounds.y + bounds.height).toBeGreaterThanOrEqual(250);
  });

  it("handles objects at the same position (overlapping)", () => {
    const objects = [
      createMockObject({ id: "a", x: 100, y: 100, width: 50, height: 50 }),
      createMockObject({ id: "b", x: 100, y: 100, width: 50, height: 50 }),
    ];
    const bounds = computeBoardBounds(objects);
    // Bounds should still be positive
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });

  it("includes 40px padding on each side for a single object", () => {
    const objects = [createMockObject({ x: 0, y: 0, width: 100, height: 80 })];
    const bounds = computeBoardBounds(objects);
    // x should be -40, y should be -40 (PADDING=40)
    expect(bounds.x).toBe(-40);
    expect(bounds.y).toBe(-40);
    expect(bounds.width).toBe(100 + 80); // width + 2*PADDING
    expect(bounds.height).toBe(80 + 80); // height + 2*PADDING
  });

  it("handles zero-size objects (point-like)", () => {
    const objects = [createMockObject({ x: 200, y: 300, width: 0, height: 0 })];
    const bounds = computeBoardBounds(objects);
    // With PADDING=40: x=160, y=260, width=80, height=80
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });
});

describe("exportBoardAsPng", () => {
  let mockCanvas: {
    getContext: ReturnType<typeof vi.fn>;
    toDataURL: ReturnType<typeof vi.fn>;
    width: number;
    height: number;
  };
  let mockCtx: Record<string, ReturnType<typeof vi.fn>>;
  let mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCtx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
    };
    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,fake"),
      width: 0,
      height: 0,
    };
    mockLink = { href: "", download: "", click: vi.fn() };

    // Store the spy to avoid using the deprecated property in assertions
    createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return mockCanvas as unknown as HTMLCanvasElement;
      if (tag === "a") return mockLink as unknown as HTMLAnchorElement;
      // Use the real original for any other tags — reached via the spy's original
      return createElementSpy.wrappedGetter
        ? (createElementSpy.wrappedGetter() as Document["createElement"])(tag)
        : ({ tagName: tag.toUpperCase() } as unknown as HTMLElement);
    });

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {
      /* no-op */
    });
  });

  it("creates an offscreen canvas for rendering", () => {
    const objects = [createMockObject({ x: 0, y: 0, width: 200, height: 150 })];
    exportBoardAsPng(objects, "My Board");
    expect(createElementSpy).toHaveBeenCalledWith("canvas");
  });

  it("calls toDataURL with image/png", () => {
    const objects = [createMockObject({ x: 0, y: 0, width: 200, height: 150 })];
    exportBoardAsPng(objects, "My Board");
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith("image/png");
  });

  it("triggers download with correct filename", () => {
    const objects = [createMockObject({ x: 0, y: 0, width: 200, height: 150 })];
    exportBoardAsPng(objects, "My Board");
    expect(mockLink.download).toBe("My Board.png");
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("handles empty board without throwing", () => {
    expect(() => {
      exportBoardAsPng([], "Empty Board");
    }).not.toThrow();
  });

  it("does not call toDataURL for empty board (early return)", () => {
    exportBoardAsPng([], "Empty Board");
    // createElement for canvas should not have been called for empty boards
    expect(mockCanvas.toDataURL).not.toHaveBeenCalled();
  });

  it("sets canvas dimensions to match bounds", () => {
    const objects = [createMockObject({ x: 0, y: 0, width: 400, height: 300 })];
    exportBoardAsPng(objects, "Sized Board");
    // bounds.width = 400 + 2*40 = 480, bounds.height = 300 + 2*40 = 380
    expect(mockCanvas.width).toBe(480);
    expect(mockCanvas.height).toBe(380);
  });

  it("fills canvas with a white background", () => {
    const objects = [createMockObject({ x: 0, y: 0, width: 200, height: 150 })];
    exportBoardAsPng(objects, "Board");
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it("handles board name with special characters in filename", () => {
    const objects = [createMockObject({ x: 0, y: 0, width: 100, height: 100 })];
    exportBoardAsPng(objects, "Board / 2026 & More");
    expect(mockLink.download).toBe("Board / 2026 & More.png");
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("handles board name with spaces", () => {
    const objects = [createMockObject({ x: 0, y: 0, width: 100, height: 100 })];
    exportBoardAsPng(objects, "My Cool Board");
    expect(mockLink.download).toBe("My Cool Board.png");
  });

  it("does not throw when canvas getContext returns null", () => {
    mockCanvas.getContext.mockReturnValue(null);
    const objects = [createMockObject({ x: 0, y: 0, width: 100, height: 100 })];
    expect(() => {
      exportBoardAsPng(objects, "Board");
    }).not.toThrow();
  });

  it("does not trigger download when canvas getContext returns null", () => {
    mockCanvas.getContext.mockReturnValue(null);
    const objects = [createMockObject({ x: 0, y: 0, width: 100, height: 100 })];
    exportBoardAsPng(objects, "Board");
    expect(mockLink.click).not.toHaveBeenCalled();
  });
});
