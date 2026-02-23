import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSession,
  saveSession,
  resolveAnaphora,
  resetStore,
  MAX_ENTRIES,
} from "../session-memory";
import type { SessionEntry } from "../session-memory";

describe("getSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for unknown userId", () => {
    const result = getSession("unknown-user", "board-1");
    expect(result).toBeNull();
  });

  it("returns the entry after saveSession", () => {
    const entry: SessionEntry = {
      lastCreatedIds: ["id-1"],
      lastModifiedIds: [],
      lastCommandText: "create a sticky note",
      timestamp: Date.now(),
    };
    saveSession("user-1", "board-1", entry);
    const result = getSession("user-1", "board-1");
    expect(result).toEqual(entry);
  });

  it("returns null when entry has expired past 5 minute TTL", () => {
    const entry: SessionEntry = {
      lastCreatedIds: ["id-1"],
      lastModifiedIds: [],
      lastCommandText: "create a sticky note",
      timestamp: Date.now(),
    };
    saveSession("user-1", "board-1", entry);

    // Advance time past the 5 minute TTL (300001ms)
    vi.advanceTimersByTime(300001);

    const result = getSession("user-1", "board-1");
    expect(result).toBeNull();
  });

  it("returns entry when within the 5 minute TTL", () => {
    const entry: SessionEntry = {
      lastCreatedIds: ["id-1"],
      lastModifiedIds: [],
      lastCommandText: "create a sticky note",
      timestamp: Date.now(),
    };
    saveSession("user-1", "board-1", entry);

    // Advance time to just under the TTL (299999ms)
    vi.advanceTimersByTime(299999);

    const result = getSession("user-1", "board-1");
    expect(result).not.toBeNull();
  });
});

describe("saveSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("overwrites previous entry when saved twice for same userId", () => {
    const firstEntry: SessionEntry = {
      lastCreatedIds: ["id-first"],
      lastModifiedIds: [],
      lastCommandText: "first command",
      timestamp: Date.now(),
    };
    saveSession("user-overwrite", "board-1", firstEntry);

    const secondEntry: SessionEntry = {
      lastCreatedIds: ["id-second"],
      lastModifiedIds: ["id-modified"],
      lastCommandText: "second command",
      timestamp: Date.now(),
    };
    saveSession("user-overwrite", "board-1", secondEntry);

    const result = getSession("user-overwrite", "board-1");
    expect(result).toEqual(secondEntry);
    expect(result?.lastCreatedIds).toEqual(["id-second"]);
    expect(result?.lastCommandText).toBe("second command");
  });

  it("returns correct session per userId when two users have different sessions", () => {
    const entryA: SessionEntry = {
      lastCreatedIds: ["id-a"],
      lastModifiedIds: [],
      lastCommandText: "user A command",
      timestamp: Date.now(),
    };
    const entryB: SessionEntry = {
      lastCreatedIds: ["id-b1", "id-b2"],
      lastModifiedIds: ["id-bm"],
      lastCommandText: "user B command",
      timestamp: Date.now(),
    };
    saveSession("user-a", "board-1", entryA);
    saveSession("user-b", "board-1", entryB);

    expect(getSession("user-a", "board-1")).toEqual(entryA);
    expect(getSession("user-b", "board-1")).toEqual(entryB);
  });

  it("evicts stale entries from other users", () => {
    const staleEntry: SessionEntry = {
      lastCreatedIds: ["id-old"],
      lastModifiedIds: [],
      lastCommandText: "old command",
      timestamp: Date.now(),
    };
    saveSession("stale-user", "board-1", staleEntry);

    // Advance past TTL
    vi.advanceTimersByTime(300001);

    // Save a new entry for a different user — should evict stale-user
    const freshEntry: SessionEntry = {
      lastCreatedIds: ["id-new"],
      lastModifiedIds: [],
      lastCommandText: "new command",
      timestamp: Date.now(),
    };
    saveSession("fresh-user", "board-1", freshEntry);

    // stale-user should be evicted
    expect(getSession("stale-user", "board-1")).toBeNull();
    // fresh-user should exist
    expect(getSession("fresh-user", "board-1")).not.toBeNull();
  });
});

describe("resolveAnaphora", () => {
  it('resolves "make it blue" with single lastCreatedId to [id]', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["abc-123"],
      lastModifiedIds: [],
      lastCommandText: "create a sticky note",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("make it blue", session);
    expect(result).toEqual(["abc-123"]);
  });

  it('resolves "change that to red" with single lastCreatedId to [id]', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["abc-123"],
      lastModifiedIds: [],
      lastCommandText: "create a sticky note",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("change that to red", session);
    expect(result).toEqual(["abc-123"]);
  });

  it('resolves "move them to the right" with multiple IDs to all IDs', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["id-1", "id-2", "id-3"],
      lastModifiedIds: [],
      lastCommandText: "create three sticky notes",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("move them to the right", session);
    expect(result).toEqual(["id-1", "id-2", "id-3"]);
  });

  it('resolves "color those green" with multiple IDs to all IDs', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["id-1", "id-2"],
      lastModifiedIds: [],
      lastCommandText: "create two notes",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("color those green", session);
    expect(result).toEqual(["id-1", "id-2"]);
  });

  it('resolves "arrange these in a grid" with multiple IDs to all IDs', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["id-1", "id-2", "id-3", "id-4"],
      lastModifiedIds: [],
      lastCommandText: "create four notes",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("arrange these in a grid", session);
    expect(result).toEqual(["id-1", "id-2", "id-3", "id-4"]);
  });

  it("returns null when session is null (no session)", () => {
    const result = resolveAnaphora("make it blue", null);
    expect(result).toBeNull();
  });

  it('returns null for "create a sticky" (no anaphora detected)', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["id-1"],
      lastModifiedIds: [],
      lastCommandText: "previous command",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("create a sticky", session);
    expect(result).toBeNull();
  });

  it('returns null for singular pronoun "it" when lastCreatedIds has multiple entries', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["id-1", "id-2", "id-3"],
      lastModifiedIds: [],
      lastCommandText: "create three notes",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("move it to the left", session);
    expect(result).toBeNull();
  });

  it('returns null for plural pronoun "them" when lastCreatedIds is empty', () => {
    const session: SessionEntry = {
      lastCreatedIds: [],
      lastModifiedIds: ["id-modified"],
      lastCommandText: "modify a note",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("move them to the right", session);
    expect(result).toBeNull();
  });

  it('returns null for plural "them" when lastCreatedIds has only 1 entry', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["single-id"],
      lastModifiedIds: [],
      lastCommandText: "create a note",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("delete them", session);
    expect(result).toBeNull();
  });

  it('falls back to lastModifiedIds for plural "them" when lastCreatedIds is empty', () => {
    const session: SessionEntry = {
      lastCreatedIds: [],
      lastModifiedIds: ["a", "b"],
      lastCommandText: "modify notes",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("delete them", session);
    expect(result).toEqual(["a", "b"]);
  });

  it('returns null for plural "those" when both created and modified have only 1 entry', () => {
    const session: SessionEntry = {
      lastCreatedIds: [],
      lastModifiedIds: ["single"],
      lastCommandText: "modify a note",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("move those", session);
    expect(result).toBeNull();
  });

  it('resolves plural "these" from lastCreatedIds when length > 1', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["x", "y", "z"],
      lastModifiedIds: [],
      lastCommandText: "create three notes",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("color these", session);
    expect(result).toEqual(["x", "y", "z"]);
  });

  it('resolves anaphora case-insensitively for uppercase pronoun "IT"', () => {
    const session: SessionEntry = {
      lastCreatedIds: ["abc-456"],
      lastModifiedIds: [],
      lastCommandText: "create a note",
      timestamp: Date.now(),
    };
    const result = resolveAnaphora("Move IT to the right", session);
    expect(result).toEqual(["abc-456"]);
  });
});

describe("session store entry cap", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it("evicts oldest entry when store exceeds MAX_ENTRIES", () => {
    for (let i = 0; i < MAX_ENTRIES + 1; i++) {
      saveSession(`user-${String(i)}`, "board-cap", {
        lastCreatedIds: [],
        lastModifiedIds: [],
        lastCommandText: `cmd-${String(i)}`,
        timestamp: Date.now() + i,
      });
    }
    // The first entry (user-0) should have been evicted
    expect(getSession("user-0", "board-cap")).toBeNull();
    // The last entry should still exist
    expect(getSession(`user-${String(MAX_ENTRIES)}`, "board-cap")).not.toBeNull();
  });
});
