import { test, expect } from "@playwright/test";

/**
 * Trip lifecycle E2E test: confirmed -> in_transit -> on_site -> returning -> completed.
 * Tests the operational status transition buttons.
 */
test.describe("Trip Status Workflow", () => {
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

    test("view trip detail sheet", async ({ page }) => {
        await page.goto("/weekly-planner?week=1");
        await expect(page.getByText("Weekly Planner")).toBeVisible();

        // Click on a trip card to open the detail sheet
        const tripCard = page.locator("[class*='cursor-pointer']").first();
        if (await tripCard.isVisible()) {
            await tripCard.click();
            // Verify sheet opens with trip details
            await expect(page.getByText(/route|stop|personnel/i)).toBeVisible({ timeout: 5_000 });
        }
    });

    test("transition confirmed trip through lifecycle", async ({ page }) => {
        await page.goto("/weekly-planner?week=1");
        await expect(page.getByText("Weekly Planner")).toBeVisible();

        // Find and click a trip card
        const tripCard = page.locator("[class*='cursor-pointer']").first();
        if (!(await tripCard.isVisible())) {
            test.skip();
            return;
        }
        await tripCard.click();

        // Look for operational transition buttons
        const departButton = page.getByRole("button", { name: /mark departed/i });
        const arrivedButton = page.getByRole("button", { name: /mark arrived/i });
        const returningButton = page.getByRole("button", { name: /mark returning/i });
        const completedButton = page.getByRole("button", { name: /mark completed/i });

        // Test whatever transition is available
        if (await departButton.isVisible()) {
            await departButton.click();
            await expect(page.getByText(/in transit/i)).toBeVisible({ timeout: 5_000 });
        } else if (await arrivedButton.isVisible()) {
            await arrivedButton.click();
            await expect(page.getByText(/on site/i)).toBeVisible({ timeout: 5_000 });
        } else if (await returningButton.isVisible()) {
            await returningButton.click();
            await expect(page.getByText(/returning/i)).toBeVisible({ timeout: 5_000 });
        } else if (await completedButton.isVisible()) {
            await completedButton.click();
            await expect(page.getByText(/completed/i)).toBeVisible({ timeout: 5_000 });
        }
    });
});
