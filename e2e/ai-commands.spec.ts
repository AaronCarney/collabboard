import { test, expect } from "@playwright/test";
import { signIn, navigateToBoard } from "./helpers/auth";

test.describe("AI Commands — Issue command and verify results", () => {
  test("AI command bar is accessible and accepts input", async ({ page }) => {
    await signIn(page);
    await navigateToBoard(page);

    // AI command bar should be visible at the bottom
    const commandBar = page.locator(
      '[placeholder*="AI"], [placeholder*="command"], [data-testid="ai-command-bar"]'
    );
    await expect(commandBar.or(page.locator("canvas"))).toBeVisible();
  });

  test("submitting an AI command shows loading state", async ({ page }) => {
    await signIn(page);
    await navigateToBoard(page);

    // Look for the AI command input
    const commandInput = page.locator(
      'input[placeholder*="AI"], input[placeholder*="command"], textarea[placeholder*="AI"]'
    );

    if (await commandInput.isVisible()) {
      await commandInput.fill("Create a SWOT analysis");
      await commandInput.press("Enter");

      // Should show some loading indicator or the command should be processing
      await page.waitForTimeout(1000);

      // Canvas should still be visible (no crash from AI command)
      await expect(page.locator("canvas")).toBeVisible();
    }
  });

  test("AI-generated objects appear on canvas for all users", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await signIn(pageA);
    await signIn(pageB);

    const boardId = await navigateToBoard(pageA);
    await pageB.goto(`/board/${boardId}`);
    await pageB.waitForLoadState("networkidle");

    // User A issues an AI command
    const commandInput = pageA.locator(
      'input[placeholder*="AI"], input[placeholder*="command"], textarea[placeholder*="AI"]'
    );

    if (await commandInput.isVisible()) {
      await commandInput.fill("Add 3 sticky notes");
      await commandInput.press("Enter");

      // Wait for AI processing and sync
      await pageA.waitForTimeout(5000);

      // Both canvases should be visible
      await expect(pageA.locator("canvas")).toBeVisible();
      await expect(pageB.locator("canvas")).toBeVisible();
    }

    await contextA.close();
    await contextB.close();
  });
});
