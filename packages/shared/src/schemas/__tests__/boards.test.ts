import { describe, it, expect } from "vitest";
import { boardSchema } from "../boards";

const validBoard = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "My Board",
  created_by: "user_123",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

describe("boardSchema", () => {
  it("parses a valid Board successfully", () => {
    const result = boardSchema.safeParse(validBoard);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validBoard);
    }
  });

  it("rejects an empty string for id", () => {
    const result = boardSchema.safeParse({ ...validBoard, id: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a non-UUID string for id", () => {
    const result = boardSchema.safeParse({ ...validBoard, id: "board-1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing name field", () => {
    const { name: _, ...noName } = validBoard;
    const result = boardSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("rejects missing created_by field", () => {
    const { created_by: _, ...noCreatedBy } = validBoard;
    const result = boardSchema.safeParse(noCreatedBy);
    expect(result.success).toBe(false);
  });

  it("rejects missing created_at field", () => {
    const { created_at: _, ...noCreatedAt } = validBoard;
    const result = boardSchema.safeParse(noCreatedAt);
    expect(result.success).toBe(false);
  });

  it("rejects missing updated_at field", () => {
    const { updated_at: _, ...noUpdatedAt } = validBoard;
    const result = boardSchema.safeParse(noUpdatedAt);
    expect(result.success).toBe(false);
  });

  it("parses an array of Boards with boardSchema.array()", () => {
    const boards = [
      validBoard,
      {
        id: "660e8400-e29b-41d4-a716-446655440001",
        name: "Second Board",
        created_by: "user_456",
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-02T00:00:00Z",
      },
    ];
    const result = boardSchema.array().safeParse(boards);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("rejects array with invalid entry (missing name)", () => {
    const { name: _, ...noName } = validBoard;
    const boards = [validBoard, noName];
    const result = boardSchema.array().safeParse(boards);
    expect(result.success).toBe(false);
  });
});
