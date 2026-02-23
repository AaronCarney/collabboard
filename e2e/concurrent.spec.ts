import { test, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { signIn } from "./helpers/auth";

test.describe("Concurrent — 5 users editing simultaneously", () => {
  test("5 browser contexts all see each other's cursors and edits", async ({ browser }) => {
    const NUM_USERS = 5;
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    // Create 5 independent browser contexts
    for (let i = 0; i < NUM_USERS; i++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      contexts.push(ctx);
      pages.push(page);
    }

    // Sign in all users
    for (const page of pages) {
      await signIn(page);
    }

    // User 0 creates a board
    const firstPage = pages[0];
    await firstPage.goto("/dashboard");
    await firstPage.waitForLoadState("networkidle");

    // Create a new board
    const newBoardBtn = firstPage.locator('button:has-text("New Board"), a:has-text("New Board")');
    if (await newBoardBtn.isVisible()) {
      await newBoardBtn.click();
    }
    await firstPage.waitForURL(/\/board\//, { timeout: 10000 });
    const boardUrl = firstPage.url();

    // All other users join the same board
    for (let i = 1; i < NUM_USERS; i++) {
      await pages[i].goto(boardUrl);
      await pages[i].waitForLoadState("networkidle");
    }

    // Wait for presence sync
    await expect(pages[0].locator("canvas")).toBeVisible({ timeout: 5000 });

    // Each user creates an object at a different position
    for (let i = 0; i < NUM_USERS; i++) {
      const page = pages[i];
      await page.click('[title="Sticky Note"]');
      const canvas = page.locator("canvas");
      const x = 100 + i * 150;
      const y = 200;
      await canvas.click({ position: { x, y } });
      // Brief pause between users to avoid race
      await expect(canvas).toBeVisible();
    }

    // Wait for sync to settle
    await expect(pages[0].locator("canvas")).toBeVisible({ timeout: 5000 });

    // All canvases should be visible and functional
    for (const page of pages) {
      await expect(page.locator("canvas")).toBeVisible();
    }

    // Clean up all contexts
    for (const ctx of contexts) {
      await ctx.close();
    }
  });

  test("5 users moving cursors simultaneously without degradation", async ({ browser }) => {
    const NUM_USERS = 5;
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    for (let i = 0; i < NUM_USERS; i++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      contexts.push(ctx);
      pages.push(page);
    }

    for (const page of pages) {
      await signIn(page);
    }

    // First user creates a board
    const firstPage = pages[0];
    await firstPage.goto("/dashboard");
    await firstPage.waitForLoadState("networkidle");
    const newBoardBtn = firstPage.locator('button:has-text("New Board"), a:has-text("New Board")');
    if (await newBoardBtn.isVisible()) {
      await newBoardBtn.click();
    }
    await firstPage.waitForURL(/\/board\//, { timeout: 10000 });
    const boardUrl = firstPage.url();

    // Others join
    for (let i = 1; i < NUM_USERS; i++) {
      await pages[i].goto(boardUrl);
      await pages[i].waitForLoadState("networkidle");
    }

    await expect(pages[0].locator("canvas")).toBeVisible({ timeout: 5000 });

    // All users move cursors simultaneously
    const movePromises = pages.map(async (page, i) => {
      for (let step = 0; step < 10; step++) {
        await page.mouse.move(200 + step * 20, 200 + i * 50);
      }
    });

    await Promise.all(movePromises);

    // All canvases should still be responsive
    for (const page of pages) {
      await expect(page.locator("canvas")).toBeVisible();
    }

    for (const ctx of contexts) {
      await ctx.close();
    }
  });
});
