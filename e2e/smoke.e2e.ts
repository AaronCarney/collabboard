import { test, expect } from "@playwright/test";

test.describe("Smoke tests — verify E2E infrastructure works", () => {
  test("home page loads without error", async ({ page }) => {
    // Track any page-level errors
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // Navigate to root
    await page.goto("/");

    // Wait for network to settle
    await page.waitForLoadState("networkidle");

    // Verify no catastrophic error page
    const title = await page.title();
    expect(title.toLowerCase()).not.toContain("error");
    expect(title.toLowerCase()).not.toContain("404");
    expect(title.toLowerCase()).not.toContain("500");

    // Verify no uncaught JavaScript errors
    expect(errors).toHaveLength(0);
  });
});
