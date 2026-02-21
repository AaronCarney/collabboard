import { describe, it, expect } from "vitest";
import { boardObjectSchema } from "@collabboard/shared";
import type { LineObject, ConnectorObject, PortName } from "@collabboard/shared";
import {
  createLineObject,
  createLineObjectQuickClick,
  createConnectorObject,
  computeDragBounds,
  getNearestPort,
} from "@/lib/canvas-drawing-utils";

const BOARD_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "user-abc-123";
const SOURCE_ID = "00000000-0000-0000-0000-000000000002";
const TARGET_ID = "00000000-0000-0000-0000-000000000003";

// ─────────────────────────────────────────────────────────────
// createLineObject
// ─────────────────────────────────────────────────────────────

describe("createLineObject", () => {
  it("creates a line from (100, 100) to (300, 200) with correct coordinates", () => {
    const line = createLineObject({
      startX: 100,
      startY: 100,
      endX: 300,
      endY: 200,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(line.x).toBe(100);
    expect(line.y).toBe(100);
    expect(line.properties.x2).toBe(300);
    expect(line.properties.y2).toBe(200);
  });

  it("has type 'line'", () => {
    const line = createLineObject({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 100,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(line.type).toBe("line");
  });

  it("has valid default properties: arrow_style 'none', stroke_style 'solid', stroke_width 2", () => {
    const line = createLineObject({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 50,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(line.properties.arrow_style).toBe("none");
    expect(line.properties.stroke_style).toBe("solid");
    expect(line.properties.stroke_width).toBe(2);
  });

  it("passes boardObjectSchema Zod validation", () => {
    const line = createLineObject({
      startX: 50,
      startY: 75,
      endX: 250,
      endY: 175,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    const result = boardObjectSchema.safeParse(line);
    expect(result.success).toBe(true);
  });

  it("has correct board_id and created_by", () => {
    const line = createLineObject({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 100,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(line.board_id).toBe(BOARD_ID);
    expect(line.created_by).toBe(USER_ID);
  });

  it("has non-empty id, created_at, and updated_at", () => {
    const line = createLineObject({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 100,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(line.id).toBeTruthy();
    expect(line.id.length).toBeGreaterThan(0);
    expect(line.created_at).toBeTruthy();
    expect(line.updated_at).toBeTruthy();
  });

  it("has width and height of 0 (lines use x,y to x2,y2)", () => {
    const line = createLineObject({
      startX: 100,
      startY: 100,
      endX: 300,
      endY: 200,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(line.width).toBe(0);
    expect(line.height).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// createLineObjectQuickClick
// ─────────────────────────────────────────────────────────────

describe("createLineObjectQuickClick", () => {
  it("quick click at (100, 100) creates a line with default length (x2 = x + 200, y2 = y)", () => {
    const line = createLineObjectQuickClick({
      x: 100,
      y: 100,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(line.x).toBe(100);
    expect(line.y).toBe(100);
    expect(line.properties.x2).toBe(300);
    expect(line.properties.y2).toBe(100);
  });

  it("the resulting quick-click line passes Zod validation", () => {
    const line = createLineObjectQuickClick({
      x: 50,
      y: 200,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    const result = boardObjectSchema.safeParse(line);
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// createConnectorObject
// ─────────────────────────────────────────────────────────────

describe("createConnectorObject", () => {
  it("creates a connector with correct from/to object IDs and ports", () => {
    const connector = createConnectorObject({
      sourceId: SOURCE_ID,
      sourcePort: "right" as PortName,
      targetId: TARGET_ID,
      targetPort: "left" as PortName,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(connector.properties.from_object_id).toBe(SOURCE_ID);
    expect(connector.properties.to_object_id).toBe(TARGET_ID);
    expect(connector.properties.from_port).toBe("right");
    expect(connector.properties.to_port).toBe("left");
  });

  it("has type 'connector'", () => {
    const connector = createConnectorObject({
      sourceId: SOURCE_ID,
      sourcePort: "bottom" as PortName,
      targetId: TARGET_ID,
      targetPort: "top" as PortName,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(connector.type).toBe("connector");
  });

  it("has arrow_style 'end' and stroke_style 'solid'", () => {
    const connector = createConnectorObject({
      sourceId: SOURCE_ID,
      sourcePort: "right" as PortName,
      targetId: TARGET_ID,
      targetPort: "left" as PortName,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(connector.properties.arrow_style).toBe("end");
    expect(connector.properties.stroke_style).toBe("solid");
  });

  it("passes boardObjectSchema Zod validation", () => {
    const connector = createConnectorObject({
      sourceId: SOURCE_ID,
      sourcePort: "top" as PortName,
      targetId: TARGET_ID,
      targetPort: "bottom" as PortName,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    const result = boardObjectSchema.safeParse(connector);
    expect(result.success).toBe(true);
  });

  it("has x, y, width, and height all equal to 0", () => {
    const connector = createConnectorObject({
      sourceId: SOURCE_ID,
      sourcePort: "right" as PortName,
      targetId: TARGET_ID,
      targetPort: "left" as PortName,
      boardId: BOARD_ID,
      userId: USER_ID,
    });

    expect(connector.x).toBe(0);
    expect(connector.y).toBe(0);
    expect(connector.width).toBe(0);
    expect(connector.height).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// computeDragBounds
// ─────────────────────────────────────────────────────────────

describe("computeDragBounds", () => {
  const defaults = { width: 200, height: 150 };

  it("normal left-to-right, top-to-bottom drag returns correct bounds", () => {
    const bounds = computeDragBounds({
      startX: 100,
      startY: 100,
      endX: 400,
      endY: 300,
      defaults,
    });

    expect(bounds.x).toBe(100);
    expect(bounds.y).toBe(100);
    expect(bounds.width).toBe(300);
    expect(bounds.height).toBe(200);
  });

  it("reverse drag normalizes to positive width/height", () => {
    const bounds = computeDragBounds({
      startX: 400,
      startY: 300,
      endX: 100,
      endY: 100,
      defaults,
    });

    expect(bounds.x).toBe(100);
    expect(bounds.y).toBe(100);
    expect(bounds.width).toBe(300);
    expect(bounds.height).toBe(200);
  });

  it("drag distance below threshold returns defaults at startX, startY", () => {
    const bounds = computeDragBounds({
      startX: 100,
      startY: 100,
      endX: 103,
      endY: 102,
      defaults,
    });

    expect(bounds.x).toBe(100);
    expect(bounds.y).toBe(100);
    expect(bounds.width).toBe(defaults.width);
    expect(bounds.height).toBe(defaults.height);
  });

  it("zero-width drag returns defaults", () => {
    const bounds = computeDragBounds({
      startX: 100,
      startY: 100,
      endX: 100,
      endY: 100,
      defaults,
    });

    expect(bounds.x).toBe(100);
    expect(bounds.y).toBe(100);
    expect(bounds.width).toBe(defaults.width);
    expect(bounds.height).toBe(defaults.height);
  });
});

// ─────────────────────────────────────────────────────────────
// getNearestPort
// ─────────────────────────────────────────────────────────────

describe("getNearestPort", () => {
  const obj = { x: 100, y: 100, width: 200, height: 200 };

  it("point above center returns 'top'", () => {
    const port = getNearestPort(obj, 200, 110);
    expect(port).toBe("top");
  });

  it("point to the right returns 'right'", () => {
    const port = getNearestPort(obj, 290, 200);
    expect(port).toBe("right");
  });

  it("point below center returns 'bottom'", () => {
    const port = getNearestPort(obj, 200, 290);
    expect(port).toBe("bottom");
  });

  it("point to the left returns 'left'", () => {
    const port = getNearestPort(obj, 110, 200);
    expect(port).toBe("left");
  });
});

// Type assertions (compile-time checks)
function assertLineObjectType(line: LineObject): void {
  void line;
}

function assertConnectorObjectType(connector: ConnectorObject): void {
  void connector;
}

describe("type shape assertions", () => {
  it("createLineObject return type is assignable to LineObject", () => {
    const line = createLineObject({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 100,
      boardId: BOARD_ID,
      userId: USER_ID,
    });
    assertLineObjectType(line);
    expect(line).toBeDefined();
  });

  it("createConnectorObject return type is assignable to ConnectorObject", () => {
    const connector = createConnectorObject({
      sourceId: SOURCE_ID,
      sourcePort: "right" as PortName,
      targetId: TARGET_ID,
      targetPort: "left" as PortName,
      boardId: BOARD_ID,
      userId: USER_ID,
    });
    assertConnectorObjectType(connector);
    expect(connector).toBeDefined();
  });
});
