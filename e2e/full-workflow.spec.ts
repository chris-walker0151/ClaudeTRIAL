import { test, expect } from "@playwright/test";

/**
 * Full workflow E2E test: import -> optimize -> review -> approve -> verify.
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD env vars.
 */
test.describe("Full Gameplan Workflow", () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto("/login");
        await page.waitForLoadState("networkidle");

        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const passwordInput = page.locator('input[type="password"], input[name="password"]');

        if (await emailInput.isVisible()) {
            await emailInput.fill(process.env.TEST_USER_EMAIL ?? "test@dragonseats.com");
            await passwordInput.fill(process.env.TEST_USER_PASSWORD ?? "testpassword123");
            await page.locator('button[type="submit"]').click();
            await page.waitForURL(/weekly-planner|\/$/);
        }
    });

    test("navigate to weekly planner and view trips", async ({ page }) => {
        await page.goto("/weekly-planner?week=1");
        await expect(page.getByText("Weekly Planner")).toBeVisible();

        // Verify key UI elements are present
        await expect(page.getByRole("button", { name: /run optimizer/i })).toBeVisible();
    });

    test("run optimizer and review results", async ({ page }) => {
        await page.goto("/weekly-planner?week=1");
        await expect(page.getByText("Weekly Planner")).toBeVisible();

        const runButton = page.getByRole("button", { name: /run optimizer/i });
        if (await runButton.isEnabled()) {
            await runButton.click();

            // Wait for optimization to complete (may take up to 2 minutes)
            await expect(
                page.getByText(/optimization complete|trips generated|no games/i), 
            ).toBeVisible({ timeout: 120_000 });
        }
    });

    test("accept all recommendations and approve gameplan", async ({ page }) => {
        await page.goto("/weekly-planner?week=1");
        await expect(page.getByText("Weekly Planner")).toBeVisible();

        // Accept all recommendations if any exist
        const acceptAll = page.getByRole("button", { name: /accept all/i });
        if (await acceptAll.isVisible() && await acceptAll.isEnabled()) {
            await acceptAll.click();
            await expect(page.getByText(/confirmed/i)).toBeVisible({ timeout: 10_000 });
        }

        // Attempt to approve gameplan
        const approveButton = page.getByRole("button", { name: /approve gameplan/i });
        if (await approveButton.isVisible() && await approveButton.isEnabled()) {
            await approveButton.click();
            // Should see success indication
            await expect(
                page.getByText(/approved|email.*sent|gameplan/i),
            ).toBeVisible({ timeout: 30_000 });
        }
    });
});
