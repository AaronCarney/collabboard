import type { Page } from "@playwright/test";

/**
 * Sign in via Clerk for E2E tests.
 *
 * Uses CLERK_E2E_EMAIL / CLERK_E2E_PASSWORD env vars for dedicated test accounts.
 * Falls back to Clerk's testing token approach if CLERK_TESTING_TOKEN is set.
 *
 * For local development without Clerk credentials, set E2E_AUTH_BYPASS=true
 * and add the corresponding middleware bypass in the app.
 */
export async function signIn(page: Page): Promise<void> {
  const testEmail = process.env["CLERK_E2E_EMAIL"];
  const testPassword = process.env["CLERK_E2E_PASSWORD"];
  const testingToken = process.env["CLERK_TESTING_TOKEN"];

  if (testingToken) {
    // Clerk Testing Token approach — bypass UI sign-in entirely
    // See: https://clerk.com/docs/testing/overview
    await page.goto(`/?__clerk_testing_token=${testingToken}`);
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    return;
  }

  if (testEmail && testPassword) {
    await page.goto("/sign-in");
    await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });
    await page.fill('input[name="identifier"]', testEmail);
    await page.click('button:has-text("Continue")');
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Continue")');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    return;
  }

  // Fallback: assume already authenticated or auth bypass is active
  await page.goto("/dashboard");
}

/**
 * Navigate to a specific board. Creates one if boardId is not provided.
 */
export async function navigateToBoard(page: Page, boardId?: string): Promise<string> {
  if (boardId) {
    await page.goto(`/board/${boardId}`);
    return boardId;
  }

  // Navigate to dashboard and create a new board
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // Click "New Board" or equivalent
  const newBoardBtn = page.locator('button:has-text("New Board"), a:has-text("New Board")');
  if (await newBoardBtn.isVisible()) {
    await newBoardBtn.click();
  }

  // Wait for board page URL
  await page.waitForURL(/\/board\//, { timeout: 10000 });
  const url = page.url();
  const match = /\/board\/([^/?]+)/.exec(url);
  return match?.[1] ?? "";
}
