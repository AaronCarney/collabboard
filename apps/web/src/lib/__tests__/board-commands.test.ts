import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BoardObject } from "@collabboard/shared";
import { boardObjectSchema } from "@collabboard/shared";
import {
  createCommandHistory,
  createCreateCommand,
  createDeleteCommand,
  createMoveCommand,
  createResizeCommand,
  createEditTextCommand,
  createChangeColorCommand,
  createMultiObjectCommand,
} from "../board-commands";
import type { CommandHistory, MutationPipeline } from "../board-commands";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeBoardObject(overrides: Partial<BoardObject> = {}): BoardObject {
  return {
    id: "obj-1",
    board_id: "board-1",
    type: "sticky_note",
    x: 0,
    y: 0,
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

function createMockPipeline(): MutationPipeline & {
  getObjects: () => Map<string, BoardObject>;
} {
  const objects = new Map<string, BoardObject>();
  return {
    upsertObjects(objs: BoardObject[]) {
      for (const obj of objs) {
        objects.set(obj.id, obj);
      }
    },
    removeObjects(ids: string[]) {
      for (const id of ids) {
        objects.delete(id);
      }
    },
    getObject(id: string) {
      return objects.get(id) ?? null;
    },
    getObjects() {
      return objects;
    },
  };
}

// ─────────────────────────────────────────────────────────────
// CommandHistory
// ─────────────────────────────────────────────────────────────

describe("CommandHistory", () => {
  let history: CommandHistory;

  beforeEach(() => {
    history = createCommandHistory();
  });

  it("starts empty — cannot undo or redo", () => {
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("executes a command and adds it to the undo stack", () => {
    const execute = vi.fn();
    const undo = vi.fn();
    history.execute({ description: "test", execute, undo });
    expect(execute).toHaveBeenCalledOnce();
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it("undo calls the command undo method", () => {
    const execute = vi.fn();
    const undo = vi.fn();
    history.execute({ description: "test", execute, undo });
    history.undo();
    expect(undo).toHaveBeenCalledOnce();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  it("redo calls execute again after undo", () => {
    const execute = vi.fn();
    const undo = vi.fn();
    history.execute({ description: "test", execute, undo });
    history.undo();
    history.redo();
    expect(execute).toHaveBeenCalledTimes(2);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it("new command after undo clears the redo stack", () => {
    const cmd1 = { description: "cmd1", execute: vi.fn(), undo: vi.fn() };
    const cmd2 = { description: "cmd2", execute: vi.fn(), undo: vi.fn() };
    history.execute(cmd1);
    history.undo();
    expect(history.canRedo()).toBe(true);
    history.execute(cmd2);
    expect(history.canRedo()).toBe(false);
  });

  it("caps the past stack at 50 entries", () => {
    for (let i = 0; i < 60; i++) {
      history.execute({
        description: `cmd-${String(i)}`,
        execute: vi.fn(),
        undo: vi.fn(),
      });
    }
    // Should be at most 50
    let undoCount = 0;
    while (history.canUndo()) {
      history.undo();
      undoCount++;
    }
    expect(undoCount).toBe(50);
  });

  it("clears all stacks on clear()", () => {
    history.execute({ description: "test", execute: vi.fn(), undo: vi.fn() });
    history.undo();
    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("undo with empty stack is a no-op", () => {
    // Should not throw
    history.undo();
    expect(history.canUndo()).toBe(false);
  });

  it("redo with empty stack is a no-op", () => {
    history.redo();
    expect(history.canRedo()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// CreateCommand
// ─────────────────────────────────────────────────────────────

describe("createCreateCommand", () => {
  it("execute upserts the object via the pipeline", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject();
    const cmd = createCreateCommand(obj, pipeline);
    cmd.execute();
    expect(pipeline.getObject(obj.id)).toEqual(obj);
  });

  it("undo removes the object via the pipeline", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject();
    const cmd = createCreateCommand(obj, pipeline);
    cmd.execute();
    cmd.undo();
    expect(pipeline.getObject(obj.id)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// DeleteCommand
// ─────────────────────────────────────────────────────────────

describe("createDeleteCommand", () => {
  it("execute removes the object", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject();
    pipeline.upsertObjects([obj]);
    const cmd = createDeleteCommand(obj, pipeline);
    cmd.execute();
    expect(pipeline.getObject(obj.id)).toBeNull();
  });

  it("undo restores the object from snapshot", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject();
    pipeline.upsertObjects([obj]);
    const cmd = createDeleteCommand(obj, pipeline);
    cmd.execute();
    cmd.undo();
    expect(pipeline.getObject(obj.id)).toEqual(obj);
  });
});

// ─────────────────────────────────────────────────────────────
// MoveCommand
// ─────────────────────────────────────────────────────────────

describe("createMoveCommand", () => {
  it("execute moves objects to new positions", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", x: 10, y: 20 });
    pipeline.upsertObjects([obj]);
    const cmd = createMoveCommand(
      [{ id: "obj-1", fromX: 10, fromY: 20, toX: 100, toY: 200 }],
      pipeline
    );
    cmd.execute();
    const moved = pipeline.getObject("obj-1");
    expect(moved?.x).toBe(100);
    expect(moved?.y).toBe(200);
  });

  it("undo restores original positions", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", x: 10, y: 20 });
    pipeline.upsertObjects([obj]);
    const cmd = createMoveCommand(
      [{ id: "obj-1", fromX: 10, fromY: 20, toX: 100, toY: 200 }],
      pipeline
    );
    cmd.execute();
    cmd.undo();
    const restored = pipeline.getObject("obj-1");
    expect(restored?.x).toBe(10);
    expect(restored?.y).toBe(20);
  });

  it("skips silently if object was deleted remotely", () => {
    const pipeline = createMockPipeline();
    // Object not in pipeline
    const cmd = createMoveCommand(
      [{ id: "deleted-obj", fromX: 0, fromY: 0, toX: 100, toY: 200 }],
      pipeline
    );
    // Should not throw
    cmd.execute();
    cmd.undo();
  });
});

// ─────────────────────────────────────────────────────────────
// ResizeCommand
// ─────────────────────────────────────────────────────────────

describe("createResizeCommand", () => {
  it("execute resizes the object", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", x: 0, y: 0, width: 200, height: 200 });
    pipeline.upsertObjects([obj]);
    const cmd = createResizeCommand(
      "obj-1",
      { x: 0, y: 0, width: 200, height: 200 },
      { x: 10, y: 10, width: 300, height: 400 },
      pipeline
    );
    cmd.execute();
    const resized = pipeline.getObject("obj-1");
    expect(resized?.width).toBe(300);
    expect(resized?.height).toBe(400);
    expect(resized?.x).toBe(10);
    expect(resized?.y).toBe(10);
  });

  it("undo restores original bounds", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", x: 0, y: 0, width: 200, height: 200 });
    pipeline.upsertObjects([obj]);
    const cmd = createResizeCommand(
      "obj-1",
      { x: 0, y: 0, width: 200, height: 200 },
      { x: 10, y: 10, width: 300, height: 400 },
      pipeline
    );
    cmd.execute();
    cmd.undo();
    const restored = pipeline.getObject("obj-1");
    expect(restored?.width).toBe(200);
    expect(restored?.height).toBe(200);
  });

  it("skips silently if object was deleted remotely", () => {
    const pipeline = createMockPipeline();
    const cmd = createResizeCommand(
      "gone",
      { x: 0, y: 0, width: 200, height: 200 },
      { x: 10, y: 10, width: 300, height: 400 },
      pipeline
    );
    cmd.execute();
    cmd.undo();
  });
});

// ─────────────────────────────────────────────────────────────
// EditTextCommand
// ─────────────────────────────────────────────────────────────

describe("createEditTextCommand", () => {
  it("execute updates the content", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", content: "old" });
    pipeline.upsertObjects([obj]);
    const cmd = createEditTextCommand("obj-1", "old", "new", pipeline);
    cmd.execute();
    expect(pipeline.getObject("obj-1")?.content).toBe("new");
  });

  it("undo restores the old content", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", content: "old" });
    pipeline.upsertObjects([obj]);
    const cmd = createEditTextCommand("obj-1", "old", "new", pipeline);
    cmd.execute();
    cmd.undo();
    expect(pipeline.getObject("obj-1")?.content).toBe("old");
  });

  it("skips silently if object was deleted remotely", () => {
    const pipeline = createMockPipeline();
    const cmd = createEditTextCommand("gone", "old", "new", pipeline);
    cmd.execute();
    cmd.undo();
  });
});

// ─────────────────────────────────────────────────────────────
// ChangeColorCommand
// ─────────────────────────────────────────────────────────────

describe("createChangeColorCommand", () => {
  it("execute updates the color", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", color: "#FF0000" });
    pipeline.upsertObjects([obj]);
    const cmd = createChangeColorCommand("obj-1", "#FF0000", "#00FF00", pipeline);
    cmd.execute();
    expect(pipeline.getObject("obj-1")?.color).toBe("#00FF00");
  });

  it("undo restores the old color", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", color: "#FF0000" });
    pipeline.upsertObjects([obj]);
    const cmd = createChangeColorCommand("obj-1", "#FF0000", "#00FF00", pipeline);
    cmd.execute();
    cmd.undo();
    expect(pipeline.getObject("obj-1")?.color).toBe("#FF0000");
  });
});

// ─────────────────────────────────────────────────────────────
// MultiObjectCommand (compound)
// ─────────────────────────────────────────────────────────────

describe("createMultiObjectCommand", () => {
  it("execute runs all sub-commands in order", () => {
    const order: string[] = [];
    const sub1 = {
      description: "sub1",
      execute: () => order.push("exec1"),
      undo: () => order.push("undo1"),
    };
    const sub2 = {
      description: "sub2",
      execute: () => order.push("exec2"),
      undo: () => order.push("undo2"),
    };
    const cmd = createMultiObjectCommand("multi", [sub1, sub2]);
    cmd.execute();
    expect(order).toEqual(["exec1", "exec2"]);
  });

  it("undo runs sub-commands in reverse order", () => {
    const order: string[] = [];
    const sub1 = {
      description: "sub1",
      execute: vi.fn(),
      undo: () => order.push("undo1"),
    };
    const sub2 = {
      description: "sub2",
      execute: vi.fn(),
      undo: () => order.push("undo2"),
    };
    const cmd = createMultiObjectCommand("multi", [sub1, sub2]);
    cmd.undo();
    expect(order).toEqual(["undo2", "undo1"]);
  });

  it("has the provided description", () => {
    const cmd = createMultiObjectCommand("Delete 3 objects", []);
    expect(cmd.description).toBe("Delete 3 objects");
  });
});

// ─────────────────────────────────────────────────────────────
// Integration: undo after remote delete
// ─────────────────────────────────────────────────────────────

describe("undo after remote delete", () => {
  it("move undo skips silently when object is gone", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", x: 0, y: 0 });
    pipeline.upsertObjects([obj]);
    const history = createCommandHistory();

    const cmd = createMoveCommand(
      [{ id: "obj-1", fromX: 0, fromY: 0, toX: 100, toY: 100 }],
      pipeline
    );
    history.execute(cmd);

    // Remote user deletes the object
    pipeline.removeObjects(["obj-1"]);

    // Undo should not throw
    history.undo();
    expect(pipeline.getObject("obj-1")).toBeNull();
  });

  it("delete undo restores from full snapshot even after remote changes", () => {
    const pipeline = createMockPipeline();
    const obj = makeBoardObject({ id: "obj-1", content: "snapshot" });
    pipeline.upsertObjects([obj]);

    const cmd = createDeleteCommand(obj, pipeline);
    const history = createCommandHistory();
    history.execute(cmd);

    // Undo restores from the snapshot taken at deletion time
    history.undo();
    expect(pipeline.getObject("obj-1")?.content).toBe("snapshot");
  });
});

// ─────────────────────────────────────────────────────────────
// Zod boundary validation
// ─────────────────────────────────────────────────────────────

describe("Zod boundary validation", () => {
  it("boardObjectSchema rejects an object with invalid type", () => {
    const bad = {
      ...makeBoardObject(),
      type: "invalid_type",
    };
    expect(() => boardObjectSchema.parse(bad)).toThrow();
  });

  it("boardObjectSchema accepts a valid sticky note", () => {
    const obj = makeBoardObject({
      id: "11111111-1111-1111-1111-111111111111",
      board_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(() => boardObjectSchema.parse(obj)).not.toThrow();
  });

  it("boardObjectSchema rejects missing required fields", () => {
    const bad = { type: "sticky_note", x: 0 };
    expect(() => boardObjectSchema.parse(bad)).toThrow();
  });

  it("boardObjectSchema rejects negative version", () => {
    const bad = {
      ...makeBoardObject({
        id: "11111111-1111-1111-1111-111111111111",
        board_id: "22222222-2222-2222-2222-222222222222",
      }),
      version: -1,
    };
    expect(() => boardObjectSchema.parse(bad)).toThrow();
  });
});
