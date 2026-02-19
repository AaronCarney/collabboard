import { describe, it, expect } from "vitest";
import type {
  BoardObject,
  FrameObject,
  StickyNoteObject,
  RectangleObject,
} from "@collabboard/shared";
import {
  getChildrenOfFrame,
  isInsideFrame,
  findContainingFrame,
  applyFrameMove,
  nullifyChildrenFrameId,
} from "../frame-containment";

function makeFrame(overrides: Partial<FrameObject> = {}): FrameObject {
  return {
    id: "frame-1",
    board_id: "board-1",
    type: "frame",
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    rotation: 0,
    content: "Frame",
    color: "#E0E0E0",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

function makeSticky(overrides: Partial<StickyNoteObject> = {}): StickyNoteObject {
  return {
    id: "sticky-1",
    board_id: "board-1",
    type: "sticky_note",
    x: 200,
    y: 200,
    width: 200,
    height: 200,
    rotation: 0,
    content: "Note",
    color: "#FFEB3B",
    version: 1,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_frame_id: null,
    properties: {},
    ...overrides,
  };
}

function makeRect(overrides: Partial<RectangleObject> = {}): RectangleObject {
  return {
    id: "rect-1",
    board_id: "board-1",
    type: "rectangle",
    x: 150,
    y: 150,
    width: 100,
    height: 80,
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

describe("frame-containment", () => {
  describe("isInsideFrame()", () => {
    it("returns true when child center is inside frame", () => {
      const frame = makeFrame({ x: 100, y: 100, width: 400, height: 300 });
      const child = makeSticky({ x: 200, y: 200, width: 100, height: 100 });
      expect(isInsideFrame(child, frame)).toBe(true);
    });

    it("returns false when child center is outside frame", () => {
      const frame = makeFrame({ x: 100, y: 100, width: 400, height: 300 });
      const child = makeSticky({ x: 600, y: 600, width: 100, height: 100 });
      expect(isInsideFrame(child, frame)).toBe(false);
    });

    it("returns false when child is partially overlapping but center is outside", () => {
      const frame = makeFrame({ x: 100, y: 100, width: 400, height: 300 });
      // Child center at (550, 550) — outside frame
      const child = makeSticky({ x: 500, y: 500, width: 100, height: 100 });
      expect(isInsideFrame(child, frame)).toBe(false);
    });
  });

  describe("getChildrenOfFrame()", () => {
    it("returns objects whose parent_frame_id matches frame id", () => {
      const frame = makeFrame({ id: "frame-a" });
      const child1 = makeSticky({ id: "s1", parent_frame_id: "frame-a" });
      const child2 = makeRect({ id: "r1", parent_frame_id: "frame-a" });
      const orphan = makeSticky({ id: "s2", parent_frame_id: null });
      const objects: BoardObject[] = [frame, child1, child2, orphan];

      const children = getChildrenOfFrame("frame-a", objects);
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.id)).toEqual(["s1", "r1"]);
    });

    it("returns empty array when no children", () => {
      const frame = makeFrame({ id: "frame-a" });
      const orphan = makeSticky({ id: "s1", parent_frame_id: null });
      const objects: BoardObject[] = [frame, orphan];

      expect(getChildrenOfFrame("frame-a", objects)).toEqual([]);
    });

    it("does not include the frame itself", () => {
      const frame = makeFrame({ id: "frame-a", parent_frame_id: "frame-a" });
      const objects: BoardObject[] = [frame];

      // Even if accidentally self-referencing, frame should not be in children
      const children = getChildrenOfFrame("frame-a", objects);
      // frame type is excluded from children
      expect(children.filter((c) => c.id === "frame-a")).toHaveLength(0);
    });
  });

  describe("findContainingFrame()", () => {
    it("returns the frame that contains the object", () => {
      const frame = makeFrame({ id: "frame-a", x: 100, y: 100, width: 400, height: 300 });
      const child = makeSticky({ id: "s1", x: 200, y: 200, width: 100, height: 100 });
      const objects: BoardObject[] = [frame, child];

      const result = findContainingFrame(child, objects);
      expect(result?.id).toBe("frame-a");
    });

    it("returns null when no frame contains the object", () => {
      const frame = makeFrame({ id: "frame-a", x: 100, y: 100, width: 400, height: 300 });
      const child = makeSticky({ id: "s1", x: 700, y: 700, width: 100, height: 100 });
      const objects: BoardObject[] = [frame, child];

      expect(findContainingFrame(child, objects)).toBeNull();
    });

    it("does not match a frame to itself", () => {
      const frame = makeFrame({ id: "frame-a", x: 100, y: 100, width: 400, height: 300 });
      const objects: BoardObject[] = [frame];

      expect(findContainingFrame(frame, objects)).toBeNull();
    });
  });

  describe("applyFrameMove()", () => {
    it("propagates delta to all children", () => {
      const child1 = makeSticky({ id: "s1", x: 200, y: 200, parent_frame_id: "frame-a" });
      const child2 = makeRect({ id: "r1", x: 300, y: 250, parent_frame_id: "frame-a" });
      const orphan = makeSticky({ id: "s2", x: 500, y: 500, parent_frame_id: null });
      const objects: BoardObject[] = [child1, child2, orphan];

      const dx = 50;
      const dy = -30;
      const moved = applyFrameMove("frame-a", dx, dy, objects);

      expect(moved).toHaveLength(2);
      const movedS1 = moved.find((o) => o.id === "s1");
      const movedR1 = moved.find((o) => o.id === "r1");
      expect(movedS1).toBeDefined();
      expect(movedR1).toBeDefined();
      if (!movedS1 || !movedR1) return;
      expect(movedS1.x).toBe(250);
      expect(movedS1.y).toBe(170);
      expect(movedR1.x).toBe(350);
      expect(movedR1.y).toBe(220);
    });

    it("returns empty array when frame has no children", () => {
      const orphan = makeSticky({ id: "s1", parent_frame_id: null });
      const objects: BoardObject[] = [orphan];

      expect(applyFrameMove("frame-a", 10, 10, objects)).toEqual([]);
    });

    it("increments version for each moved child", () => {
      const child = makeSticky({
        id: "s1",
        x: 200,
        y: 200,
        parent_frame_id: "frame-a",
        version: 3,
      });
      const objects: BoardObject[] = [child];

      const moved = applyFrameMove("frame-a", 10, 10, objects);
      expect(moved[0].version).toBe(4);
    });
  });

  describe("nullifyChildrenFrameId()", () => {
    it("sets parent_frame_id to null for all children of deleted frame", () => {
      const child1 = makeSticky({ id: "s1", parent_frame_id: "frame-a" });
      const child2 = makeRect({ id: "r1", parent_frame_id: "frame-a" });
      const unrelated = makeSticky({ id: "s2", parent_frame_id: "frame-b" });
      const objects: BoardObject[] = [child1, child2, unrelated];

      const updated = nullifyChildrenFrameId("frame-a", objects);
      expect(updated).toHaveLength(2);
      expect(updated.every((o) => o.parent_frame_id === null)).toBe(true);
    });

    it("returns empty array when frame has no children", () => {
      const objects: BoardObject[] = [makeSticky({ id: "s1", parent_frame_id: null })];
      expect(nullifyChildrenFrameId("frame-a", objects)).toEqual([]);
    });
  });
});
