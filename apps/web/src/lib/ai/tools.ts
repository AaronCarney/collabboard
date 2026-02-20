import { v4 as uuidv4 } from "uuid";
import type { BoardObject } from "@collabboard/shared";
import { z, OBJECT_DEFAULTS } from "@collabboard/shared";
import { tool } from "ai";

// ─── Tool Parameter Schemas ──────────────────────────────────

export const createStickyNoteParams = z.object({
  text: z.string().describe("Text content for the sticky note"),
  x: z.number().describe("X position in world coordinates"),
  y: z.number().describe("Y position in world coordinates"),
  color: z.string().optional().describe("Hex color (default: #FFEB3B)"),
});

export const createShapeParams = z.object({
  type: z.enum(["rectangle", "circle", "text"]).describe("Shape type"),
  x: z.number().describe("X position"),
  y: z.number().describe("Y position"),
  width: z.number().describe("Width in pixels"),
  height: z.number().describe("Height in pixels"),
  color: z.string().optional().describe("Hex color"),
});

export const createFrameParams = z.object({
  title: z.string().describe("Frame title text"),
  x: z.number().describe("X position"),
  y: z.number().describe("Y position"),
  width: z.number().describe("Width in pixels"),
  height: z.number().describe("Height in pixels"),
});

export const moveObjectParams = z.object({
  objectId: z.string().uuid().describe("ID of object to move"),
  x: z.number().describe("New X position"),
  y: z.number().describe("New Y position"),
});

export const resizeObjectParams = z.object({
  objectId: z.string().uuid().describe("ID of object to resize"),
  width: z.number().describe("New width"),
  height: z.number().describe("New height"),
});

export const updateTextParams = z.object({
  objectId: z.string().uuid().describe("ID of object to update"),
  newText: z.string().describe("New text content"),
});

export const changeColorParams = z.object({
  objectId: z.string().uuid().describe("ID of object to recolor"),
  color: z.string().describe("New hex color"),
});

export const getBoardStateParams = z.object({});

// ─── Tool Executors ──────────────────────────────────────────

function makeTimestamp(): string {
  return new Date().toISOString();
}

export function executeCreateStickyNote(
  args: z.infer<typeof createStickyNoteParams>,
  boardId: string,
  userId: string
): BoardObject {
  const defaults = OBJECT_DEFAULTS.sticky_note;
  return {
    id: uuidv4(),
    board_id: boardId,
    type: "sticky_note",
    x: args.x,
    y: args.y,
    width: defaults.width ?? 200,
    height: defaults.height ?? 200,
    rotation: 0,
    content: args.text,
    color: args.color ?? "#FFEB3B",
    version: 1,
    created_by: userId,
    created_at: makeTimestamp(),
    updated_at: makeTimestamp(),
    parent_frame_id: null,
    properties: {},
  } as BoardObject;
}

export function executeCreateShape(
  args: z.infer<typeof createShapeParams>,
  boardId: string,
  userId: string
): BoardObject {
  const defaults = OBJECT_DEFAULTS[args.type];
  return {
    id: uuidv4(),
    board_id: boardId,
    type: args.type,
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
    rotation: 0,
    content: "",
    color: args.color ?? defaults.color ?? "#42A5F5",
    version: 1,
    created_by: userId,
    created_at: makeTimestamp(),
    updated_at: makeTimestamp(),
    parent_frame_id: null,
    properties: {},
  } as BoardObject;
}

export function executeCreateFrame(
  args: z.infer<typeof createFrameParams>,
  boardId: string,
  userId: string
): BoardObject {
  return {
    id: uuidv4(),
    board_id: boardId,
    type: "frame",
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
    rotation: 0,
    content: args.title,
    color: "#E0E0E0",
    version: 1,
    created_by: userId,
    created_at: makeTimestamp(),
    updated_at: makeTimestamp(),
    parent_frame_id: null,
    properties: {},
  } as BoardObject;
}

export function executeMoveObject(
  args: z.infer<typeof moveObjectParams>,
  objects: BoardObject[]
): BoardObject | null {
  const obj = objects.find((o) => o.id === args.objectId);
  if (!obj) return null;
  return {
    ...obj,
    x: args.x,
    y: args.y,
    version: obj.version + 1,
    updated_at: makeTimestamp(),
  };
}

export function executeResizeObject(
  args: z.infer<typeof resizeObjectParams>,
  objects: BoardObject[]
): BoardObject | null {
  const obj = objects.find((o) => o.id === args.objectId);
  if (!obj) return null;
  return {
    ...obj,
    width: args.width,
    height: args.height,
    version: obj.version + 1,
    updated_at: makeTimestamp(),
  };
}

export function executeUpdateText(
  args: z.infer<typeof updateTextParams>,
  objects: BoardObject[]
): BoardObject | null {
  const obj = objects.find((o) => o.id === args.objectId);
  if (!obj) return null;
  return {
    ...obj,
    content: args.newText,
    version: obj.version + 1,
    updated_at: makeTimestamp(),
  };
}

export function executeChangeColor(
  args: z.infer<typeof changeColorParams>,
  objects: BoardObject[]
): BoardObject | null {
  const obj = objects.find((o) => o.id === args.objectId);
  if (!obj) return null;
  return {
    ...obj,
    color: args.color,
    version: obj.version + 1,
    updated_at: makeTimestamp(),
  };
}

// ─── Vercel AI SDK Tool Definitions ──────────────────────────

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getToolDefinitions() {
  return {
    createStickyNote: tool({
      description: "Create a new sticky note on the board",
      inputSchema: createStickyNoteParams,
    }),
    createShape: tool({
      description: "Create a shape (rectangle, circle, or text) on the board",
      inputSchema: createShapeParams,
    }),
    createFrame: tool({
      description: "Create a frame to group objects together",
      inputSchema: createFrameParams,
    }),
    moveObject: tool({
      description: "Move an existing object to a new position",
      inputSchema: moveObjectParams,
    }),
    resizeObject: tool({
      description: "Resize an existing object",
      inputSchema: resizeObjectParams,
    }),
    updateText: tool({
      description: "Update the text content of an existing object",
      inputSchema: updateTextParams,
    }),
    changeColor: tool({
      description: "Change the color of an existing object",
      inputSchema: changeColorParams,
    }),
    getBoardState: tool({
      description: "Get the current state of all objects on the board",
      inputSchema: getBoardStateParams,
    }),
  };
}
