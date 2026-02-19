import { test, expect } from "@playwright/test";
import { signIn, navigateToBoard } from "./helpers/auth";

test.describe("Resilience — Network throttle and disconnect recovery", () => {
  test("operates under Slow 3G conditions", async ({ page, context }) => {
    await signIn(page);
    await navigateToBoard(page);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Enable Slow 3G network throttling via CDP
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send("Network.enable");
    await cdpSession.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (400 * 1024) / 8, // 400 Kbps
      uploadThroughput: (400 * 1024) / 8,
      latency: 2000, // 2s latency
    });

    // Create an object under throttled conditions
    await page.click('[title="Sticky Note"]');
    await canvas.click({ position: { x: 300, y: 300 } });

    // Wait longer for slow network
    await page.waitForTimeout(5000);

    // Canvas should still be responsive
    await expect(canvas).toBeVisible();

    // Restore normal network
    await cdpSession.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  });

  test("recovers after network disconnect and reconnect", async ({ page, context }) => {
    await signIn(page);
    await navigateToBoard(page);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Create an object while online
    await page.click('[title="Rectangle"]');
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(1000);

    // Go offline
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send("Network.enable");
    await cdpSession.send("Network.emulateNetworkConditions", {
      offline: true,
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0,
    });

    // Create another object while offline (should work optimistically)
    await page.click('[title="Circle"]');
    await canvas.click({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(500);

    // Canvas should still be functional (optimistic updates)
    await expect(canvas).toBeVisible();

    // Reconnect
    await cdpSession.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });

    // Wait for reconnection and sync
    await page.waitForTimeout(3000);

    // Page should still be stable
    await expect(canvas).toBeVisible();
  });
});
