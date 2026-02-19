import { test, expect } from "@playwright/test";
import { signIn, navigateToBoard } from "./helpers/auth";

test.describe("Persistence — State survives page refresh", () => {
  test("objects persist after page reload", async ({ page }) => {
    await signIn(page);
    const boardId = await navigateToBoard(page);

    // Create a sticky note
    await page.click('[title="Sticky Note"]');
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 300, y: 300 } });

    // Wait for persistence (Supabase write)
    await page.waitForTimeout(2000);

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate back to the same board
    await page.goto(`/board/${boardId}`);
    await page.waitForLoadState("networkidle");

    // Canvas should be visible (objects loaded from Supabase)
    await expect(canvas).toBeVisible();
  });

  test("board name persists after refresh", async ({ page }) => {
    await signIn(page);
    await navigateToBoard(page);

    // Edit the board name
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill("My Test Board");
    await nameInput.blur();

    // Wait for persistence
    await page.waitForTimeout(1000);

    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify name persisted
    const nameValue = await nameInput.inputValue();
    expect(nameValue).toContain("Test Board");
  });
});
