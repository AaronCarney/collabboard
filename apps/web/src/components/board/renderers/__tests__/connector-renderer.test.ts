import { describe, it, expect, vi, beforeEach } from "vitest";
import { connectorRenderer, setObjectResolver } from "../connector-renderer";
import type { ConnectorObject, RectangleObject, BoardObject } from "@collabboard/shared";

function makeCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
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
    rotate: vi.fn(),
    arcTo: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeRect(overrides: Partial<RectangleObject> = {}): RectangleObject {
  return {
    id: "rect-1",
    board_id: "board-1",
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    rotation: 0,
    content: "",
    color: "#42A5F5",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

function makeConnector(overrides: Partial<ConnectorObject> = {}): ConnectorObject {
  return {
    id: "conn-1",
    board_id: "board-1",
    type: "connector",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    content: "",
    color: "#333333",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {
      from_object_id: "rect-1",
      to_object_id: "rect-2",
      from_port: "right",
      to_port: "left",
      arrow_style: "end",
      stroke_style: "solid",
    },
    ...overrides,
  };
}

describe("connectorRenderer", () => {
  let ctx: CanvasRenderingContext2D;
  const rectA = makeRect({ id: "rect-1", x: 100, y: 100, width: 200, height: 150 });
  const rectB = makeRect({ id: "rect-2", x: 500, y: 200, width: 200, height: 150 });

  beforeEach(() => {
    ctx = makeCtx();
    const objectMap = new Map<string, BoardObject>([
      [rectA.id, rectA],
      [rectB.id, rectB],
    ]);
    setObjectResolver((id: string) => objectMap.get(id) ?? null);
  });

  describe("port resolution", () => {
    it("resolves 'right' port to right edge center of source object", () => {
      const conn = makeConnector({
        properties: {
          from_object_id: "rect-1",
          to_object_id: "rect-2",
          from_port: "right",
          to_port: "left",
          arrow_style: "none",
          stroke_style: "solid",
        },
      });
      connectorRenderer.draw(ctx, conn, false);

      // right port of rectA: x + width, y + height/2 = 300, 175
      expect(ctx.moveTo).toHaveBeenCalledWith(300, 175);
      // left port of rectB: x, y + height/2 = 500, 275
      expect(ctx.lineTo).toHaveBeenCalledWith(500, 275);
    });

    it("resolves 'top' port to top edge center", () => {
      const conn = makeConnector({
        properties: {
          from_object_id: "rect-1",
          to_object_id: "rect-2",
          from_port: "top",
          to_port: "bottom",
          arrow_style: "none",
          stroke_style: "solid",
        },
      });
      connectorRenderer.draw(ctx, conn, false);

      // top port of rectA: x + width/2, y = 200, 100
      expect(ctx.moveTo).toHaveBeenCalledWith(200, 100);
      // bottom port of rectB: x + width/2, y + height = 600, 350
      expect(ctx.lineTo).toHaveBeenCalledWith(600, 350);
    });

    it("resolves 'center' port to object center", () => {
      const conn = makeConnector({
        properties: {
          from_object_id: "rect-1",
          to_object_id: "rect-2",
          from_port: "center",
          to_port: "center",
          arrow_style: "none",
          stroke_style: "solid",
        },
      });
      connectorRenderer.draw(ctx, conn, false);

      // center of rectA: 200, 175
      expect(ctx.moveTo).toHaveBeenCalledWith(200, 175);
      // center of rectB: 600, 275
      expect(ctx.lineTo).toHaveBeenCalledWith(600, 275);
    });
  });

  describe("dangling connector", () => {
    it("renders dashed line when source object is deleted", () => {
      setObjectResolver(() => null);

      const conn = makeConnector();
      connectorRenderer.draw(ctx, conn, false);

      // Should still render (fallback to connector's x,y) with dashed style
      expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("renders dashed line when only target is missing", () => {
      const objectMap = new Map<string, BoardObject>([[rectA.id, rectA]]);
      setObjectResolver((id: string) => objectMap.get(id) ?? null);

      const conn = makeConnector();
      connectorRenderer.draw(ctx, conn, false);

      // Should render with dangling style
      expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
    });
  });

  describe("draw()", () => {
    it("draws arrowhead at end when arrow_style is 'end'", () => {
      const conn = makeConnector({
        properties: {
          from_object_id: "rect-1",
          to_object_id: "rect-2",
          from_port: "right",
          to_port: "left",
          arrow_style: "end",
          stroke_style: "solid",
        },
      });
      connectorRenderer.draw(ctx, conn, false);
      expect(ctx.fill).toHaveBeenCalled();
    });

    it("draws two arrowheads when arrow_style is 'both'", () => {
      const conn = makeConnector({
        properties: {
          from_object_id: "rect-1",
          to_object_id: "rect-2",
          from_port: "right",
          to_port: "left",
          arrow_style: "both",
          stroke_style: "solid",
        },
      });
      connectorRenderer.draw(ctx, conn, false);
      const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(fillCalls).toBe(2);
    });

    it("draws selection highlight when selected", () => {
      const conn = makeConnector();
      connectorRenderer.draw(ctx, conn, true);
      const strokeCalls = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(strokeCalls).toBeGreaterThanOrEqual(2);
    });
  });

  describe("hitTest()", () => {
    it("returns true for a point near the connector line", () => {
      // Connector from right of rectA (300,175) to left of rectB (500,275)
      const conn = makeConnector();
      // Midpoint: 400, 225
      expect(connectorRenderer.hitTest(conn, 400, 225)).toBe(true);
    });

    it("returns false for a point far from the connector line", () => {
      const conn = makeConnector();
      expect(connectorRenderer.hitTest(conn, 50, 50)).toBe(false);
    });

    it("returns false when both objects are missing", () => {
      setObjectResolver(() => null);
      const conn = makeConnector();
      // Dangling connector with fallback (0,0)→(0,0) — only hits at origin
      expect(connectorRenderer.hitTest(conn, 200, 200)).toBe(false);
    });
  });

  describe("getBounds()", () => {
    it("returns bounding box enclosing both port positions", () => {
      // right of rectA (300,175) to left of rectB (500,275)
      const conn = makeConnector();
      const bounds = connectorRenderer.getBounds(conn);
      expect(bounds.x).toBe(300);
      expect(bounds.y).toBe(175);
      expect(bounds.width).toBe(200);
      expect(bounds.height).toBe(100);
    });
  });

  describe("getResizeHandles()", () => {
    it("returns empty array (connectors are not resizable)", () => {
      const conn = makeConnector();
      expect(connectorRenderer.getResizeHandles(conn)).toEqual([]);
    });
  });

  describe("render context (no singleton)", () => {
    it("uses objectResolver from render context instead of module-level singleton", () => {
      // Reset the module-level resolver to prove it's not used
      setObjectResolver(() => null);

      const conn = makeConnector();
      const objectMap = new Map<string, BoardObject>([
        [rectA.id, rectA],
        [rectB.id, rectB],
      ]);
      const renderContext = {
        objectResolver: (id: string): BoardObject | null => objectMap.get(id) ?? null,
      };

      connectorRenderer.draw(ctx, conn, false, renderContext);

      // Should resolve ports correctly via context (not the null singleton)
      // right of rectA (300,175) to left of rectB (500,275)
      expect(ctx.moveTo).toHaveBeenCalledWith(300, 175);
      expect(ctx.lineTo).toHaveBeenCalledWith(500, 275);
    });

    it("hitTest uses render context objectResolver", () => {
      setObjectResolver(() => null);

      const conn = makeConnector();
      const objectMap = new Map<string, BoardObject>([
        [rectA.id, rectA],
        [rectB.id, rectB],
      ]);
      const renderContext = {
        objectResolver: (id: string): BoardObject | null => objectMap.get(id) ?? null,
      };

      // Midpoint of connector (300,175)→(500,275) ≈ (400,225)
      expect(connectorRenderer.hitTest(conn, 400, 225, renderContext)).toBe(true);
    });

    it("getBounds uses render context objectResolver", () => {
      setObjectResolver(() => null);

      const conn = makeConnector();
      const objectMap = new Map<string, BoardObject>([
        [rectA.id, rectA],
        [rectB.id, rectB],
      ]);
      const renderContext = {
        objectResolver: (id: string): BoardObject | null => objectMap.get(id) ?? null,
      };

      const bounds = connectorRenderer.getBounds(conn, renderContext);
      expect(bounds.x).toBe(300);
      expect(bounds.y).toBe(175);
      expect(bounds.width).toBe(200);
      expect(bounds.height).toBe(100);
    });
  });
});
