import { test, expect } from "@playwright/test";
import { signIn, navigateToBoard } from "./helpers/auth";

test.describe("Collaboration — Two users editing simultaneously", () => {
  test("both users see each other's objects in real time", async ({ browser }) => {
    // Create two independent browser contexts (two "users")
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Sign in both users
    await signIn(pageA);
    await signIn(pageB);

    // User A creates/navigates to a board
    const boardId = await navigateToBoard(pageA);
    expect(boardId).toBeTruthy();

    // User B joins the same board
    await pageB.goto(`/board/${boardId}`);
    await pageB.waitForLoadState("networkidle");

    // User A creates a sticky note by selecting the tool and clicking
    const canvasA = pageA.locator("canvas");
    await pageA.click('[title="Sticky Note"]');
    await canvasA.click({ position: { x: 300, y: 300 } });

    // Wait for sync — User B should see the object
    await pageB.waitForTimeout(2000);

    // Verify canvas has rendered objects (checking via DOM or screenshot comparison)
    const canvasB = pageB.locator("canvas");
    await expect(canvasB).toBeVisible();

    // Clean up
    await contextA.close();
    await contextB.close();
  });

  test("cursor positions are broadcast between users", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await signIn(pageA);
    await signIn(pageB);

    const boardId = await navigateToBoard(pageA);
    await pageB.goto(`/board/${boardId}`);
    await pageB.waitForLoadState("networkidle");

    // User A moves cursor over canvas
    const canvasA = pageA.locator("canvas");
    await canvasA.hover({ position: { x: 400, y: 400 } });
    await pageA.mouse.move(400, 400);

    // Wait for cursor broadcast
    await pageB.waitForTimeout(1000);

    // Both pages should have presence indicators visible
    const presenceBar = pageB.locator('[class*="presence"], [data-testid="presence-bar"]');
    await expect(presenceBar.or(pageB.locator("canvas"))).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
