import { describe, it, expect } from "vitest";
import { computeFitToScreen } from "@/lib/view-controls";

interface BoardObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FitCamera {
  x: number;
  y: number;
  zoom: number;
}

function worldToScreen(
  worldX: number,
  worldY: number,
  camera: FitCamera
): { sx: number; sy: number } {
  return {
    sx: worldX * camera.zoom + camera.x,
    sy: worldY * camera.zoom + camera.y,
  };
}

describe("computeFitToScreen", () => {
  describe("empty board", () => {
    it("returns the default camera when the object list is empty", () => {
      const result: FitCamera = computeFitToScreen([], 1000, 800);
      expect(result).toEqual({ x: 0, y: 0, zoom: 1 });
    });
  });

  describe("single object", () => {
    it("centers the object in the viewport", () => {
      const obj: BoardObject = { x: 100, y: 100, width: 200, height: 150 };
      const viewportWidth = 1000;
      const viewportHeight = 800;

      const result: FitCamera = computeFitToScreen([obj], viewportWidth, viewportHeight);

      const objCenterWorldX = obj.x + obj.width / 2;
      const objCenterWorldY = obj.y + obj.height / 2;
      const { sx, sy } = worldToScreen(objCenterWorldX, objCenterWorldY, result);

      expect(sx).toBeCloseTo(viewportWidth / 2, 1);
      expect(sy).toBeCloseTo(viewportHeight / 2, 1);
    });

    it("fits the object with default padding inside the viewport", () => {
      const obj: BoardObject = { x: 100, y: 100, width: 200, height: 150 };
      const viewportWidth = 1000;
      const viewportHeight = 800;
      const defaultPadding = 50;

      const result: FitCamera = computeFitToScreen([obj], viewportWidth, viewportHeight);

      const leftEdgeScreen = worldToScreen(obj.x, obj.y, result).sx;
      const rightEdgeScreen = worldToScreen(obj.x + obj.width, obj.y, result).sx;
      const topEdgeScreen = worldToScreen(obj.x, obj.y, result).sy;
      const bottomEdgeScreen = worldToScreen(obj.x, obj.y + obj.height, result).sy;

      expect(leftEdgeScreen).toBeGreaterThanOrEqual(defaultPadding - 1);
      expect(rightEdgeScreen).toBeLessThanOrEqual(viewportWidth - defaultPadding + 1);
      expect(topEdgeScreen).toBeGreaterThanOrEqual(defaultPadding - 1);
      expect(bottomEdgeScreen).toBeLessThanOrEqual(viewportHeight - defaultPadding + 1);
    });
  });

  describe("multiple objects", () => {
    it("fits the full bounding box of scattered objects into the viewport", () => {
      const objects: BoardObject[] = [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 500, y: 500, width: 100, height: 100 },
      ];
      const viewportWidth = 1000;
      const viewportHeight = 800;

      const result: FitCamera = computeFitToScreen(objects, viewportWidth, viewportHeight);

      const topLeft = worldToScreen(0, 0, result);
      const bottomRight = worldToScreen(600, 600, result);

      expect(topLeft.sx).toBeGreaterThanOrEqual(0);
      expect(topLeft.sy).toBeGreaterThanOrEqual(0);
      expect(bottomRight.sx).toBeLessThanOrEqual(viewportWidth);
      expect(bottomRight.sy).toBeLessThanOrEqual(viewportHeight);
    });

    it("does not zoom in past 100%", () => {
      const objects: BoardObject[] = [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 500, y: 500, width: 100, height: 100 },
      ];

      const result: FitCamera = computeFitToScreen(objects, 1000, 800);
      expect(result.zoom).toBeLessThanOrEqual(1);
    });

    it("centers the bounding box in the viewport", () => {
      const objects: BoardObject[] = [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 500, y: 500, width: 100, height: 100 },
      ];
      const viewportWidth = 1000;
      const viewportHeight = 800;

      const result: FitCamera = computeFitToScreen(objects, viewportWidth, viewportHeight);

      const { sx, sy } = worldToScreen(300, 300, result);
      expect(sx).toBeCloseTo(viewportWidth / 2, 0);
      expect(sy).toBeCloseTo(viewportHeight / 2, 0);
    });
  });

  describe("large bounding box (zoom out)", () => {
    it("zooms out when objects span more than the viewport", () => {
      const objects: BoardObject[] = [{ x: 0, y: 0, width: 5000, height: 3000 }];
      const result: FitCamera = computeFitToScreen(objects, 1000, 800);
      expect(result.zoom).toBeLessThan(1);
    });

    it("produces zoom close to min(availW/bbW, availH/bbH) with default padding", () => {
      const objects: BoardObject[] = [{ x: 0, y: 0, width: 5000, height: 3000 }];
      const viewportWidth = 1000;
      const viewportHeight = 800;
      const defaultPadding = 50;

      const result: FitCamera = computeFitToScreen(objects, viewportWidth, viewportHeight);

      const availableW = viewportWidth - defaultPadding * 2;
      const availableH = viewportHeight - defaultPadding * 2;
      const expectedZoom = Math.min(availableW / 5000, availableH / 3000);

      expect(result.zoom).toBeCloseTo(expectedZoom, 4);
    });
  });

  describe("small bounding box — zoom capped at 1.0", () => {
    it("does not zoom in past 1.0 for a tiny object", () => {
      const objects: BoardObject[] = [{ x: 400, y: 300, width: 10, height: 10 }];
      const result: FitCamera = computeFitToScreen(objects, 1000, 800);
      expect(result.zoom).toBeLessThanOrEqual(1);
    });

    it("returns zoom exactly 1 for a tiny object", () => {
      const objects: BoardObject[] = [{ x: 495, y: 395, width: 10, height: 10 }];
      const result: FitCamera = computeFitToScreen(objects, 1000, 800);
      expect(result.zoom).toBe(1);
    });
  });

  describe("padding", () => {
    it("uses 50px default padding", () => {
      const objects: BoardObject[] = [{ x: 0, y: 0, width: 800, height: 600 }];
      const result: FitCamera = computeFitToScreen(objects, 1000, 800);

      const availableW = 1000 - 50 * 2;
      const availableH = 800 - 50 * 2;
      const expectedZoom = Math.min(availableW / 800, availableH / 600);

      expect(result.zoom).toBeCloseTo(Math.min(expectedZoom, 1), 4);
    });

    it("respects a custom padding value", () => {
      const objects: BoardObject[] = [{ x: 0, y: 0, width: 800, height: 600 }];
      const result: FitCamera = computeFitToScreen(objects, 1000, 800, 100);

      const availableW = 1000 - 100 * 2;
      const availableH = 800 - 100 * 2;
      const expectedZoom = Math.min(availableW / 800, availableH / 600);

      expect(result.zoom).toBeCloseTo(Math.min(expectedZoom, 1), 4);
    });

    it("uses zero padding when passed as 0", () => {
      const objects: BoardObject[] = [{ x: 0, y: 0, width: 1000, height: 800 }];
      const result: FitCamera = computeFitToScreen(objects, 1000, 800, 0);
      expect(result.zoom).toBeCloseTo(1, 4);
    });
  });

  describe("viewport edge cases", () => {
    it("returns default camera when viewport is 0x0", () => {
      const objects: BoardObject[] = [{ x: 0, y: 0, width: 100, height: 100 }];
      const result: FitCamera = computeFitToScreen(objects, 0, 0);
      expect(result).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it("returns default camera when viewport width is 0", () => {
      const objects: BoardObject[] = [{ x: 0, y: 0, width: 100, height: 100 }];
      const result: FitCamera = computeFitToScreen(objects, 0, 800);
      expect(result).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it("returns default camera when viewport height is 0", () => {
      const objects: BoardObject[] = [{ x: 0, y: 0, width: 100, height: 100 }];
      const result: FitCamera = computeFitToScreen(objects, 1000, 0);
      expect(result).toEqual({ x: 0, y: 0, zoom: 1 });
    });
  });
});
