import { test, expect } from "./fixtures";

test.describe("Authentication, Onboarding & Public Flows", () => {
  test("login page renders branding, inputs, and validation feedback", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle(/DuesPilot/i);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Work Email Address")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In to Dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign up|Create account/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Forgot password\?/i })).toBeVisible();

    // Submit with empty inputs triggers validation
    await page.getByRole("button", { name: /Sign In to Dashboard/i }).click();
    const emailInput = page.getByLabel("Work Email Address");
    await expect(emailInput).toBeFocused();
  });

  test("password visibility toggle switches input type between password and text", async ({
    page,
  }) => {
    await page.goto("/login");

    const passwordInput = page.locator("#password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle button
    const toggleBtn = page.getByRole("button", { name: /show password|hide password/i });
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click again to hide
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("company onboarding registration form renders all required fields", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: /Create your account/i })).toBeVisible();
    await expect(page.getByLabel(/Your Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Work Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Company \/ Trade Name/i)).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Account/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign In/i })).toBeVisible();
  });

  test("forgot password page renders email dispatch interface", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByRole("heading", { name: /Reset password/i })).toBeVisible();
    await expect(page.getByLabel(/Work Email Address/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Send Reset Link/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to sign in/i })).toBeVisible();
  });

  test("reset password page renders token validation and password change form", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=test_token_123");

    await expect(page.getByRole("heading", { name: /Set a new password/i })).toBeVisible();
    await expect(page.getByLabel(/^New Password$/i)).toBeVisible();
    await expect(page.getByLabel(/^Confirm New Password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Update Password/i })).toBeVisible();
  });

  test("landing page renders marketing hero, value propositions, and navigation", async ({
    page,
  }) => {
    await page.goto("/");

    // Hero section & Brand
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Free Trial|Get Started/i }).first()).toBeVisible();
  });

  test("terms of service and privacy policy static pages render cleanly", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /Terms of Service/i })).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /Privacy Policy/i })).toBeVisible();
  });
});
