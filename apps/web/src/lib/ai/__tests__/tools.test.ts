import { describe, it, expect } from "vitest";
import { boardObjectSchema } from "@collabboard/shared";
import {
  executeCreateStickyNote,
  executeCreateShape,
  executeCreateFrame,
  executeMoveObject,
  executeResizeObject,
  executeUpdateText,
  executeChangeColor,
  executeCreateConnector,
  executeDeleteObject,
  getToolDefinitions,
} from "../tools";
import type { BoardObject } from "@collabboard/shared";

const BOARD_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "user-1";

function makeObjects(): BoardObject[] {
  return [
    {
      id: "22222222-2222-2222-2222-222222222222",
      board_id: BOARD_ID,
      type: "sticky_note",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      content: "Existing note",
      color: "#FFEB3B",
      version: 1,
      created_by: USER_ID,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      parent_frame_id: null,
      properties: {},
    },
  ];
}

describe("AI tools — executeCreateStickyNote", () => {
  it("creates a valid sticky note BoardObject", () => {
    const result = executeCreateStickyNote(
      { text: "User Research", x: 200, y: 300, color: "#FFEB3B" },
      BOARD_ID,
      USER_ID
    );
    expect(result.type).toBe("sticky_note");
    expect(result.content).toBe("User Research");
    expect(result.x).toBe(200);
    expect(result.y).toBe(300);
    expect(result.color).toBe("#FFEB3B");
    expect(boardObjectSchema.safeParse(result).success).toBe(true);
  });

  it("uses default color when not specified", () => {
    const result = executeCreateStickyNote({ text: "Note", x: 0, y: 0 }, BOARD_ID, USER_ID);
    expect(result.color).toBe("#FFEB3B");
  });
});

describe("AI tools — executeCreateShape", () => {
  it("creates a valid rectangle", () => {
    const result = executeCreateShape(
      { type: "rectangle", x: 50, y: 50, width: 300, height: 200, color: "#42A5F5" },
      BOARD_ID,
      USER_ID
    );
    expect(result.type).toBe("rectangle");
    expect(result.width).toBe(300);
    expect(boardObjectSchema.safeParse(result).success).toBe(true);
  });

  it("creates a valid circle", () => {
    const result = executeCreateShape(
      { type: "circle", x: 100, y: 100, width: 150, height: 150, color: "#66BB6A" },
      BOARD_ID,
      USER_ID
    );
    expect(result.type).toBe("circle");
    expect(boardObjectSchema.safeParse(result).success).toBe(true);
  });
});

describe("AI tools — executeCreateFrame", () => {
  it("creates a valid frame with title", () => {
    const result = executeCreateFrame(
      { title: "Sprint Board", x: 0, y: 0, width: 600, height: 400 },
      BOARD_ID,
      USER_ID
    );
    expect(result.type).toBe("frame");
    expect(result.content).toBe("Sprint Board");
    expect(result.width).toBe(600);
    expect(boardObjectSchema.safeParse(result).success).toBe(true);
  });
});

describe("AI tools — executeMoveObject", () => {
  it("returns updated object with new position", () => {
    const objects = makeObjects();
    const result = executeMoveObject(
      { objectId: "22222222-2222-2222-2222-222222222222", x: 500, y: 600 },
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.x).toBe(500);
    expect(result.y).toBe(600);
    expect(result.version).toBe(2);
  });

  it("returns null for non-existent object", () => {
    const result = executeMoveObject(
      { objectId: "99999999-9999-9999-9999-999999999999", x: 0, y: 0 },
      makeObjects()
    );
    expect(result).toBeNull();
  });
});

describe("AI tools — executeResizeObject", () => {
  it("returns updated object with new dimensions", () => {
    const objects = makeObjects();
    const result = executeResizeObject(
      { objectId: "22222222-2222-2222-2222-222222222222", width: 400, height: 300 },
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.version).toBe(2);
  });

  it("returns null for non-existent object", () => {
    const result = executeResizeObject(
      { objectId: "99999999-9999-9999-9999-999999999999", width: 400, height: 300 },
      makeObjects()
    );
    expect(result).toBeNull();
  });
});

describe("AI tools — executeUpdateText", () => {
  it("returns updated object with new content", () => {
    const objects = makeObjects();
    const result = executeUpdateText(
      { objectId: "22222222-2222-2222-2222-222222222222", newText: "Updated content" },
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.content).toBe("Updated content");
  });

  it("returns null for non-existent object", () => {
    const result = executeUpdateText(
      { objectId: "99999999-9999-9999-9999-999999999999", newText: "Updated content" },
      makeObjects()
    );
    expect(result).toBeNull();
  });
});

describe("AI tools — executeChangeColor", () => {
  it("returns updated object with new color", () => {
    const objects = makeObjects();
    const result = executeChangeColor(
      { objectId: "22222222-2222-2222-2222-222222222222", color: "#FF0000" },
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.color).toBe("#FF0000");
  });

  it("returns null for non-existent object", () => {
    const result = executeChangeColor(
      { objectId: "99999999-9999-9999-9999-999999999999", color: "#FF0000" },
      makeObjects()
    );
    expect(result).toBeNull();
  });
});

// ─── New tools (Phase 1, Tasks 1-3) ─────────────────────────

const FROM_ID = "22222222-2222-2222-2222-222222222222";
const TO_ID = "33333333-3333-3333-3333-333333333333";

function makeConnectorObjects(): BoardObject[] {
  return [
    {
      id: FROM_ID,
      board_id: BOARD_ID,
      type: "sticky_note",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      content: "Source",
      color: "#FFEB3B",
      version: 1,
      created_by: USER_ID,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      parent_frame_id: null,
      properties: {},
    },
    {
      id: TO_ID,
      board_id: BOARD_ID,
      type: "sticky_note",
      x: 500,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      content: "Target",
      color: "#90CAF9",
      version: 1,
      created_by: USER_ID,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      parent_frame_id: null,
      properties: {},
    },
  ];
}

describe("AI tools — executeCreateConnector", () => {
  it("creates a BoardObject with type connector", () => {
    const objects = makeConnectorObjects();
    const result = executeCreateConnector(
      { fromId: FROM_ID, toId: TO_ID, style: "arrow" },
      BOARD_ID,
      USER_ID,
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.type).toBe("connector");
  });

  it("populates connector properties with from/to object IDs", () => {
    const objects = makeConnectorObjects();
    const result = executeCreateConnector(
      { fromId: FROM_ID, toId: TO_ID, style: "arrow" },
      BOARD_ID,
      USER_ID,
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.properties).toHaveProperty("from_object_id", FROM_ID);
    expect(result.properties).toHaveProperty("to_object_id", TO_ID);
  });

  it("sets arrow_style based on the style argument", () => {
    const objects = makeConnectorObjects();
    const result = executeCreateConnector(
      { fromId: FROM_ID, toId: TO_ID, style: "dashed" },
      BOARD_ID,
      USER_ID,
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.properties).toHaveProperty("stroke_style", "dashed");
  });

  it("sets arrow_style to 'none' when style is 'line'", () => {
    const objects = makeConnectorObjects();
    const result = executeCreateConnector(
      { fromId: FROM_ID, toId: TO_ID, style: "line" },
      BOARD_ID,
      USER_ID,
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.properties).toHaveProperty("arrow_style", "none");
    expect(result.properties).toHaveProperty("stroke_style", "solid");
  });

  it("defaults to arrow style when style is not provided", () => {
    const objects = makeConnectorObjects();
    const result = executeCreateConnector(
      { fromId: FROM_ID, toId: TO_ID },
      BOARD_ID,
      USER_ID,
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.properties).toHaveProperty("arrow_style", "end");
  });

  it("returns null when fromId does not exist", () => {
    const objects = makeConnectorObjects();
    const result = executeCreateConnector(
      { fromId: "99999999-9999-9999-9999-999999999999", toId: TO_ID },
      BOARD_ID,
      USER_ID,
      objects
    );
    expect(result).toBeNull();
  });

  it("returns null when toId does not exist", () => {
    const objects = makeConnectorObjects();
    const result = executeCreateConnector(
      { fromId: FROM_ID, toId: "99999999-9999-9999-9999-999999999999" },
      BOARD_ID,
      USER_ID,
      objects
    );
    expect(result).toBeNull();
  });

  it("validates as a valid BoardObject via schema", () => {
    const objects = makeConnectorObjects();
    const result = executeCreateConnector(
      { fromId: FROM_ID, toId: TO_ID, style: "arrow" },
      BOARD_ID,
      USER_ID,
      objects
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(boardObjectSchema.safeParse(result).success).toBe(true);
  });
});

describe("AI tools — executeDeleteObject", () => {
  it("returns a DeletionMarker with correct objectId", () => {
    const objects = makeConnectorObjects();
    const result = executeDeleteObject({ objectId: FROM_ID }, objects);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.type).toBe("deletion");
    expect(result.objectId).toBe(FROM_ID);
  });

  it("returns null when object is not found", () => {
    const objects = makeConnectorObjects();
    const result = executeDeleteObject(
      { objectId: "99999999-9999-9999-9999-999999999999" },
      objects
    );
    expect(result).toBeNull();
  });

  it("does not return a BoardObject (no board_id, version, etc.)", () => {
    const objects = makeConnectorObjects();
    const result = executeDeleteObject({ objectId: FROM_ID }, objects);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result).not.toHaveProperty("board_id");
    expect(result).not.toHaveProperty("version");
  });
});

describe("AI tools — getToolDefinitions", () => {
  it("returns definitions for 10 tools", () => {
    const tools = getToolDefinitions();
    expect(Object.keys(tools)).toHaveLength(10);
  });

  it("includes createConnector tool", () => {
    const tools = getToolDefinitions();
    expect(tools).toHaveProperty("createConnector");
  });

  it("includes deleteObject tool", () => {
    const tools = getToolDefinitions();
    expect(tools).toHaveProperty("deleteObject");
  });
});

// ─── B3: Tool naming — camelCase enforcement ────────────────

describe("AI tools — getToolDefinitions camelCase naming (B3)", () => {
  it("uses createConnector (camelCase) instead of create_connector (AC7)", () => {
    const tools = getToolDefinitions();
    expect(tools).toHaveProperty("createConnector");
    expect(tools).not.toHaveProperty("create_connector");
  });

  it("uses deleteObject (camelCase) instead of delete_object (AC7)", () => {
    const tools = getToolDefinitions();
    expect(tools).toHaveProperty("deleteObject");
    expect(tools).not.toHaveProperty("delete_object");
  });

  it("all tool names are camelCase (no underscores)", () => {
    const tools = getToolDefinitions();
    const names = Object.keys(tools);
    for (const name of names) {
      expect(name).not.toContain("_");
    }
  });
});
