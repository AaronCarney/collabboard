import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    channel: vi.fn(),
    auth: { getSession: vi.fn() },
  })),
}));

import { createClient } from "@supabase/supabase-js";
import { createSupabaseClient, createServiceClient } from "../client";

describe("Supabase Client Factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a browser client with anon key", () => {
    const client = createSupabaseClient("https://test.supabase.co", "anon-key-123");
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "anon-key-123",
      expect.any(Object)
    );
    expect(client).toBeDefined();
  });

  it("creates a service client with service role key", () => {
    const client = createServiceClient("https://test.supabase.co", "service-role-key-456");
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "service-role-key-456",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
      })
    );
    expect(client).toBeDefined();
  });

  it("throws if url is empty", () => {
    expect(() => createSupabaseClient("", "key")).toThrow();
  });

  it("throws if key is empty", () => {
    expect(() => createSupabaseClient("https://test.supabase.co", "")).toThrow();
  });
});
