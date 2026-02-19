import { describe, it, expect } from "vitest";

// We import the metadata export directly — it's a static object
// We need to get it without triggering React rendering
// layout.tsx exports `metadata` as a named export

describe("Layout metadata", () => {
  it("has required metadata fields", async () => {
    // Dynamic import to get the metadata export
    const mod = await import("../layout");
    const metadata = mod.metadata;

    expect(metadata).toBeDefined();
    expect(metadata.title).toBeDefined();
    expect(metadata.description).toBeDefined();
  });

  it("has OpenGraph metadata", async () => {
    const mod = await import("../layout");
    const metadata = mod.metadata;

    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph).toHaveProperty("title");
    expect(metadata.openGraph).toHaveProperty("description");
    expect(metadata.openGraph).toHaveProperty("type");
  });

  it("has icons configured", async () => {
    const mod = await import("../layout");
    const metadata = mod.metadata;

    expect(metadata.icons).toBeDefined();
  });

  it("has twitter card metadata", async () => {
    const mod = await import("../layout");
    const metadata = mod.metadata;

    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter).toHaveProperty("card");
  });
});
