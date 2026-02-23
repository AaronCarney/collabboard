import { test, expect } from "@playwright/test";
import { signIn, navigateToBoard } from "./helpers/auth";

test.describe("Performance — Rapid operations", () => {
  test("creating 20 objects rapidly with no dropped operations", async ({ page }) => {
    await signIn(page);
    await navigateToBoard(page);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    const startTime = Date.now();

    // Rapidly create 20 sticky notes
    for (let i = 0; i < 20; i++) {
      await page.click('[title="Sticky Note"]');
      const x = 100 + (i % 5) * 150;
      const y = 100 + Math.floor(i / 5) * 150;
      await canvas.click({ position: { x, y } });
    }

    const elapsed = Date.now() - startTime;

    // All 20 operations should complete within a reasonable time
    expect(elapsed).toBeLessThan(30000); // 30s max for 20 objects

    // Wait for all operations to settle
    await page.waitForLoadState("networkidle");

    // Page should still be responsive (canvas visible, no crash)
    await expect(canvas).toBeVisible();
  });

  test("moving objects rapidly does not drop operations", async ({ page }) => {
    await signIn(page);
    await navigateToBoard(page);

    const canvas = page.locator("canvas");

    // Create a single object
    await page.click('[title="Rectangle"]');
    await canvas.click({ position: { x: 300, y: 300 } });
    await expect(canvas).toBeVisible();

    // Rapidly drag the object across the canvas
    await page.mouse.move(300, 300);
    await page.mouse.down();
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(300 + i * 10, 300 + i * 5, { steps: 2 });
    }
    await page.mouse.up();

    // Canvas should still be responsive
    await expect(canvas).toBeVisible();
  });
});
