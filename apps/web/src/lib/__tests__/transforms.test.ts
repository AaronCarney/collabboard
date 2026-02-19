import { describe, it, expect, beforeEach } from "vitest";
import type { BoardObject } from "@collabboard/shared";
import type { MutationPipeline, CommandHistory } from "../board-commands";
import { createCommandHistory } from "../board-commands";
import {
  degreesToRadians,
  getRotationHandlePosition,
  serializeObjectsToClipboard,
  deserializeClipboard,
  createDuplicates,
  createPasteCommand,
  createDuplicateCommand,
} from "../transforms";

function makeObject(overrides: Partial<BoardObject> = {}): BoardObject {
  return {
    id: "obj-1",
    board_id: "board-1",
    type: "sticky_note",
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    content: "Hello",
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

function createMockPipeline(): MutationPipeline & {
  store: Map<string, BoardObject>;
} {
  const store = new Map<string, BoardObject>();
  return {
    store,
    upsertObjects(objects: BoardObject[]) {
      for (const obj of objects) {
        store.set(obj.id, obj);
      }
    },
    removeObjects(ids: string[]) {
      for (const id of ids) {
        store.delete(id);
      }
    },
    getObject(id: string) {
      return store.get(id) ?? null;
    },
  };
}

describe("transforms", () => {
  describe("degreesToRadians", () => {
    it("converts 0 degrees to 0 radians", () => {
      expect(degreesToRadians(0)).toBe(0);
    });

    it("converts 90 degrees to PI/2 radians", () => {
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    });

    it("converts 180 degrees to PI radians", () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    });

    it("converts 360 degrees to 2*PI radians", () => {
      expect(degreesToRadians(360)).toBeCloseTo(Math.PI * 2);
    });

    it("converts negative degrees", () => {
      expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2);
    });
  });

  describe("getRotationHandlePosition", () => {
    it("returns a point above the center of the object", () => {
      const obj = makeObject({ x: 100, y: 100, width: 200, height: 200, rotation: 0 });
      const handle = getRotationHandlePosition(obj);
      // Center is at (200, 200), handle 30px above = (200, 70)
      expect(handle.x).toBeCloseTo(200);
      expect(handle.y).toBeCloseTo(70);
    });

    it("rotates the handle position when object is rotated", () => {
      const obj = makeObject({ x: 100, y: 100, width: 200, height: 200, rotation: 90 });
      const handle = getRotationHandlePosition(obj);
      // Center is (200, 200), handle starts at (200, 70), rotated 90° CW
      // After rotation: should be to the right of center
      expect(handle.x).toBeCloseTo(330);
      expect(handle.y).toBeCloseTo(200);
    });
  });

  describe("serializeObjectsToClipboard / deserializeClipboard", () => {
    it("serializes objects to JSON string", () => {
      const obj = makeObject();
      const json = serializeObjectsToClipboard([obj]);
      expect(typeof json).toBe("string");
      const parsed = JSON.parse(json) as unknown;
      expect(Array.isArray(parsed)).toBe(true);
    });

    it("deserializes JSON back to objects", () => {
      const obj = makeObject({ content: "test content" });
      const json = serializeObjectsToClipboard([obj]);
      const result = deserializeClipboard(json);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("test content");
    });

    it("preserves all object fields through serialization", () => {
      const obj = makeObject({ rotation: 45, color: "#FF0000" });
      const json = serializeObjectsToClipboard([obj]);
      const result = deserializeClipboard(json);
      expect(result[0].rotation).toBe(45);
      expect(result[0].color).toBe("#FF0000");
    });

    it("returns empty array for invalid JSON", () => {
      expect(deserializeClipboard("not json")).toEqual([]);
    });

    it("returns empty array for non-array JSON", () => {
      expect(deserializeClipboard('{"foo": 1}')).toEqual([]);
    });
  });

  describe("createDuplicates", () => {
    it("generates new IDs for duplicated objects", () => {
      const obj = makeObject({ id: "original-id" });
      const dupes = createDuplicates([obj]);
      expect(dupes).toHaveLength(1);
      expect(dupes[0].id).not.toBe("original-id");
    });

    it("offsets duplicated objects by 20px", () => {
      const obj = makeObject({ x: 100, y: 100 });
      const dupes = createDuplicates([obj]);
      expect(dupes[0].x).toBe(120);
      expect(dupes[0].y).toBe(120);
    });

    it("resets version to 1", () => {
      const obj = makeObject({ version: 5 });
      const dupes = createDuplicates([obj]);
      expect(dupes[0].version).toBe(1);
    });

    it("handles multiple objects", () => {
      const obj1 = makeObject({ id: "a", x: 10, y: 10 });
      const obj2 = makeObject({ id: "b", x: 50, y: 50 });
      const dupes = createDuplicates([obj1, obj2]);
      expect(dupes).toHaveLength(2);
      expect(dupes[0].id).not.toBe("a");
      expect(dupes[1].id).not.toBe("b");
      expect(dupes[0].x).toBe(30);
      expect(dupes[1].x).toBe(70);
    });

    it("accepts custom offset", () => {
      const obj = makeObject({ x: 0, y: 0 });
      const dupes = createDuplicates([obj], 50);
      expect(dupes[0].x).toBe(50);
      expect(dupes[0].y).toBe(50);
    });
  });

  describe("createPasteCommand", () => {
    let pipeline: ReturnType<typeof createMockPipeline>;
    let history: CommandHistory;

    beforeEach(() => {
      pipeline = createMockPipeline();
      history = createCommandHistory();
    });

    it("creates and inserts objects on execute", () => {
      const obj = makeObject({ id: "paste-1", x: 0, y: 0 });
      const cmd = createPasteCommand([obj], pipeline);
      history.execute(cmd);
      expect(pipeline.store.has("paste-1")).toBe(true);
    });

    it("removes pasted objects on undo", () => {
      const obj = makeObject({ id: "paste-1" });
      const cmd = createPasteCommand([obj], pipeline);
      history.execute(cmd);
      expect(pipeline.store.has("paste-1")).toBe(true);
      history.undo();
      expect(pipeline.store.has("paste-1")).toBe(false);
    });

    it("re-inserts on redo", () => {
      const obj = makeObject({ id: "paste-1" });
      const cmd = createPasteCommand([obj], pipeline);
      history.execute(cmd);
      history.undo();
      history.redo();
      expect(pipeline.store.has("paste-1")).toBe(true);
    });

    it("handles multiple objects", () => {
      const objects = [makeObject({ id: "p1" }), makeObject({ id: "p2" })];
      const cmd = createPasteCommand(objects, pipeline);
      history.execute(cmd);
      expect(pipeline.store.size).toBe(2);
      history.undo();
      expect(pipeline.store.size).toBe(0);
    });
  });

  describe("createDuplicateCommand", () => {
    let pipeline: ReturnType<typeof createMockPipeline>;
    let history: CommandHistory;

    beforeEach(() => {
      pipeline = createMockPipeline();
      history = createCommandHistory();
    });

    it("duplicates objects with offset and new IDs", () => {
      const orig = makeObject({ id: "orig-1", x: 100, y: 100 });
      pipeline.upsertObjects([orig]);
      const cmd = createDuplicateCommand(["orig-1"], pipeline);
      history.execute(cmd);
      // Should have original + duplicate
      expect(pipeline.store.size).toBe(2);
      const entries = Array.from(pipeline.store.values());
      const dupe = entries.find((o) => o.id !== "orig-1");
      expect(dupe).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(dupe!.x).toBe(120);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(dupe!.y).toBe(120);
    });

    it("undoes by removing duplicated objects", () => {
      const orig = makeObject({ id: "orig-1" });
      pipeline.upsertObjects([orig]);
      const cmd = createDuplicateCommand(["orig-1"], pipeline);
      history.execute(cmd);
      expect(pipeline.store.size).toBe(2);
      history.undo();
      expect(pipeline.store.size).toBe(1);
      expect(pipeline.store.has("orig-1")).toBe(true);
    });

    it("skips missing objects gracefully", () => {
      const cmd = createDuplicateCommand(["nonexistent"], pipeline);
      history.execute(cmd);
      expect(pipeline.store.size).toBe(0);
    });

    it("returns the created duplicate IDs", () => {
      const orig = makeObject({ id: "orig-1" });
      pipeline.upsertObjects([orig]);
      const cmd = createDuplicateCommand(["orig-1"], pipeline);
      history.execute(cmd);
      expect(cmd.createdIds).toHaveLength(1);
      expect(cmd.createdIds[0]).not.toBe("orig-1");
    });
  });
});
