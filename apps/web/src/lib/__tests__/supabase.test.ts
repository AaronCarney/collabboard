import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────
// Mock @supabase/supabase-js so we can inspect createClient args
// ─────────────────────────────────────────────────────────────
const mockCreateClient = vi.hoisted(() => vi.fn(() => ({ __mock: true })));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { createClerkSupabaseClient } from "../supabase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createClerkSupabaseClient", () => {
  it("passes accessToken at top level only, not under realtime", () => {
    const getToken = vi.fn().mockResolvedValue("clerk-token");
    createClerkSupabaseClient(getToken);

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    const [, , options] = mockCreateClient.mock.calls[0];

    expect(options).toHaveProperty("accessToken");
    expect(typeof options.accessToken).toBe("function");

    // Must NOT have realtime.accessToken — it overrides Supabase internals
    expect(options).not.toHaveProperty("realtime");
  });

  it("accessToken returns the Clerk token when available", async () => {
    const getToken = vi.fn().mockResolvedValue("my-clerk-jwt");
    createClerkSupabaseClient(getToken);

    const [, , options] = mockCreateClient.mock.calls[0];
    const token = await options.accessToken();

    expect(token).toBe("my-clerk-jwt");
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it("accessToken returns null when Clerk has no session", async () => {
    const getToken = vi.fn().mockResolvedValue(null);
    createClerkSupabaseClient(getToken);

    const [, , options] = mockCreateClient.mock.calls[0];
    const token = await options.accessToken();

    // Must be null, NOT empty string — empty string causes 401
    expect(token).toBeNull();
  });

  it("accessToken returns null when Clerk returns undefined", async () => {
    const getToken = vi.fn().mockResolvedValue(undefined);
    createClerkSupabaseClient(getToken);

    const [, , options] = mockCreateClient.mock.calls[0];
    const token = await options.accessToken();

    expect(token).toBeNull();
  });

  it("uses env vars for URL and anon key", () => {
    const getToken = vi.fn().mockResolvedValue("token");
    createClerkSupabaseClient(getToken);

    const [url, anonKey] = mockCreateClient.mock.calls[0];

    // These come from process.env; in test they'll be empty strings
    expect(typeof url).toBe("string");
    expect(typeof anonKey).toBe("string");
  });
});
