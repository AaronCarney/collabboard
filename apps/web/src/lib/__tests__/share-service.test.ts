import { describe, it, expect, vi, beforeEach } from "vitest";
import { createShareService } from "../share-service";
import type { ShareService } from "../share-service";

const mockShare = {
  id: "11111111-1111-1111-1111-111111111111",
  board_id: "22222222-2222-2222-2222-222222222222",
  access_level: "view",
  token: "33333333-3333-3333-3333-333333333333",
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  expires_at: null,
};

function makeMockSupabase() {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({
    single: mockSingle,
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => ({ data: [mockShare], error: null })),
  }));
  const mockInsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => ({ data: mockShare, error: null })),
    })),
  }));
  const mockDelete = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null })),
    })),
  }));

  const supabase = {
    from: vi.fn((table: string) => {
      void table;
      return {
        insert: mockInsert,
        delete: mockDelete,
        select: mockSelect,
      };
    }),
  };

  return { supabase, mockSingle, mockInsert, mockDelete, mockSelect };
}

describe("ShareService", () => {
  let service: ShareService;
  let mocks: ReturnType<typeof makeMockSupabase>;

  beforeEach(() => {
    mocks = makeMockSupabase();
    service = createShareService(mocks.supabase as never);
  });

  describe("createShare()", () => {
    it("inserts a share record and returns parsed result", async () => {
      const result = await service.createShare(
        "22222222-2222-2222-2222-222222222222",
        "view",
        "user-1"
      );

      expect(mocks.supabase.from).toHaveBeenCalledWith("board_shares");
      expect(result.board_id).toBe("22222222-2222-2222-2222-222222222222");
      expect(result.access_level).toBe("view");
      expect(result.token).toBe("33333333-3333-3333-3333-333333333333");
    });
  });

  describe("deleteShare()", () => {
    it("deletes by share id and user id", async () => {
      await service.deleteShare("11111111-1111-1111-1111-111111111111", "user-1");

      expect(mocks.supabase.from).toHaveBeenCalledWith("board_shares");
    });
  });

  describe("listShares()", () => {
    it("returns validated shares for a board", async () => {
      const shares = await service.listShares("22222222-2222-2222-2222-222222222222", "user-1");

      expect(shares).toHaveLength(1);
      expect(shares[0].token).toBe("33333333-3333-3333-3333-333333333333");
    });
  });

  describe("validateToken()", () => {
    it("returns share for valid token", async () => {
      mocks.mockSingle.mockReturnValue({ data: mockShare, error: null });

      const result = await service.validateToken("33333333-3333-3333-3333-333333333333");

      expect(result).not.toBeNull();
      expect(result?.access_level).toBe("view");
    });

    it("returns null for missing token", async () => {
      mocks.mockSingle.mockReturnValue({ data: null, error: { message: "not found" } });

      const result = await service.validateToken("00000000-0000-0000-0000-000000000000");

      expect(result).toBeNull();
    });

    it("returns null for expired token", async () => {
      const expiredShare = {
        ...mockShare,
        expires_at: "2020-01-01T00:00:00Z",
      };
      mocks.mockSingle.mockReturnValue({ data: expiredShare, error: null });

      const result = await service.validateToken("33333333-3333-3333-3333-333333333333");

      expect(result).toBeNull();
    });
  });
});
