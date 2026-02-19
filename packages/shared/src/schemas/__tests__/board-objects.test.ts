import { describe, it, expect } from "vitest";
import {
  boardObjectSchema,
  stickyNoteSchema,
  rectangleSchema,
  circleSchema,
  textSchema,
  lineSchema,
  connectorSchema,
  frameSchema,
} from "../board-objects";
const baseFields = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  board_id: "660e8400-e29b-41d4-a716-446655440001",
  x: 100,
  y: 200,
  width: 200,
  height: 150,
  rotation: 0,
  content: "Hello",
  color: "#FFEB3B",
  version: 1,
  created_by: "user_123",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  parent_frame_id: null,
};

describe("Board Object Zod Schemas", () => {
  describe("stickyNoteSchema", () => {
    it("validates a valid sticky note", () => {
      const stickyNote = {
        ...baseFields,
        type: "sticky_note" as const,
        properties: {},
      };
      const result = stickyNoteSchema.safeParse(stickyNote);
      expect(result.success).toBe(true);
    });
  });

  describe("rectangleSchema", () => {
    it("validates a valid rectangle", () => {
      const rectangle = {
        ...baseFields,
        type: "rectangle" as const,
        properties: {},
      };
      const result = rectangleSchema.safeParse(rectangle);
      expect(result.success).toBe(true);
    });
  });

  describe("circleSchema", () => {
    it("validates a valid circle", () => {
      const circle = {
        ...baseFields,
        type: "circle" as const,
        properties: {},
      };
      const result = circleSchema.safeParse(circle);
      expect(result.success).toBe(true);
    });
  });

  describe("textSchema", () => {
    it("validates a valid text object", () => {
      const text = {
        ...baseFields,
        type: "text" as const,
        properties: {},
      };
      const result = textSchema.safeParse(text);
      expect(result.success).toBe(true);
    });
  });

  describe("lineSchema", () => {
    it("validates a valid line", () => {
      const line = {
        ...baseFields,
        type: "line" as const,
        properties: {
          x2: 300,
          y2: 400,
          arrow_style: "end",
          stroke_style: "solid",
          stroke_width: 2,
        },
      };
      const result = lineSchema.safeParse(line);
      expect(result.success).toBe(true);
    });

    it("rejects a line with missing properties", () => {
      const line = {
        ...baseFields,
        type: "line" as const,
        properties: { x2: 300 },
      };
      const result = lineSchema.safeParse(line);
      expect(result.success).toBe(false);
    });

    it("rejects invalid arrow_style", () => {
      const line = {
        ...baseFields,
        type: "line" as const,
        properties: {
          x2: 300,
          y2: 400,
          arrow_style: "invalid",
          stroke_style: "solid",
          stroke_width: 2,
        },
      };
      const result = lineSchema.safeParse(line);
      expect(result.success).toBe(false);
    });
  });

  describe("connectorSchema", () => {
    it("validates a valid connector", () => {
      const connector = {
        ...baseFields,
        type: "connector" as const,
        properties: {
          from_object_id: "550e8400-e29b-41d4-a716-446655440001",
          to_object_id: "550e8400-e29b-41d4-a716-446655440002",
          from_port: "right",
          to_port: "left",
          arrow_style: "end",
          stroke_style: "solid",
        },
      };
      const result = connectorSchema.safeParse(connector);
      expect(result.success).toBe(true);
    });

    it("rejects a connector with invalid port", () => {
      const connector = {
        ...baseFields,
        type: "connector" as const,
        properties: {
          from_object_id: "550e8400-e29b-41d4-a716-446655440001",
          to_object_id: "550e8400-e29b-41d4-a716-446655440002",
          from_port: "diagonal",
          to_port: "left",
          arrow_style: "end",
          stroke_style: "solid",
        },
      };
      const result = connectorSchema.safeParse(connector);
      expect(result.success).toBe(false);
    });
  });

  describe("frameSchema", () => {
    it("validates a valid frame", () => {
      const frame = {
        ...baseFields,
        type: "frame" as const,
        properties: {},
      };
      const result = frameSchema.safeParse(frame);
      expect(result.success).toBe(true);
    });
  });

  describe("boardObjectSchema (discriminated union)", () => {
    it("parses a sticky note through the union", () => {
      const obj = {
        ...baseFields,
        type: "sticky_note" as const,
        properties: {},
      };
      const result = boardObjectSchema.safeParse(obj);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("sticky_note");
      }
    });

    it("parses a line through the union", () => {
      const obj = {
        ...baseFields,
        type: "line" as const,
        properties: {
          x2: 300,
          y2: 400,
          arrow_style: "none",
          stroke_style: "dashed",
          stroke_width: 1,
        },
      };
      const result = boardObjectSchema.safeParse(obj);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("line");
      }
    });

    it("parses a connector through the union", () => {
      const obj = {
        ...baseFields,
        type: "connector" as const,
        properties: {
          from_object_id: "550e8400-e29b-41d4-a716-446655440001",
          to_object_id: "550e8400-e29b-41d4-a716-446655440002",
          from_port: "top",
          to_port: "bottom",
          arrow_style: "both",
          stroke_style: "dotted",
        },
      };
      const result = boardObjectSchema.safeParse(obj);
      expect(result.success).toBe(true);
    });

    it("rejects an unknown object type", () => {
      const obj = {
        ...baseFields,
        type: "hexagon",
        properties: {},
      };
      const result = boardObjectSchema.safeParse(obj);
      expect(result.success).toBe(false);
    });

    it("rejects missing required base fields", () => {
      const obj = {
        type: "sticky_note",
        properties: {},
      };
      const result = boardObjectSchema.safeParse(obj);
      expect(result.success).toBe(false);
    });

    it("narrows type correctly for line objects", () => {
      const obj = {
        ...baseFields,
        type: "line" as const,
        properties: {
          x2: 300,
          y2: 400,
          arrow_style: "end" as const,
          stroke_style: "solid" as const,
          stroke_width: 2,
        },
      };
      const result = boardObjectSchema.safeParse(obj);
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = result.data;
        if (parsed.type === "line") {
          expect(parsed.properties.x2).toBe(300);
          expect(parsed.properties.y2).toBe(400);
        }
      }
    });

    it("accepts valid parent_frame_id", () => {
      const obj = {
        ...baseFields,
        type: "sticky_note" as const,
        parent_frame_id: "770e8400-e29b-41d4-a716-446655440003",
        properties: {},
      };
      const result = boardObjectSchema.safeParse(obj);
      expect(result.success).toBe(true);
    });

    it("rejects negative version", () => {
      const obj = {
        ...baseFields,
        type: "sticky_note" as const,
        version: -1,
        properties: {},
      };
      const result = boardObjectSchema.safeParse(obj);
      expect(result.success).toBe(false);
    });
  });
});
