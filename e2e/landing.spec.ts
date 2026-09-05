import { test, expect } from "@playwright/test";

test.describe("Public Landing Page & Interactive Product Tour", () => {
  test("renders hero, statutory MSME claims banner, and navigation links", async ({ page }) => {
    await page.goto("/");

    // Top banner
    await expect(page.getByText("MSMED Act 2006 Compliant")).toBeVisible();
    await expect(page.getByText(/Claim statutory 3x RBI compound penal interest/i)).toBeVisible();

    // Brand navigation
    await expect(page.getByRole("navigation").getByText("DuesPilot")).toBeVisible();
    await expect(page.getByText("Collections OS")).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Free Trial/i }).first()).toBeVisible();

    // Hero title
    await expect(
      page.getByRole("heading", { name: /Stop chasing overdue B2B invoices manually/i })
    ).toBeVisible();
  });

  test("interactive product tour switches between feature tabs", async ({ page }) => {
    await page.goto("/");

    // Interactive Preview Section
    await expect(
      page.getByRole("heading", { name: /An intelligent command center built for recovery teams/i })
    ).toBeVisible();

    // Default Tab: Daily Collection Queue
    await expect(page.getByText(/Today's Priority Collection Actions|Raj Steel Fabrications/i).first()).toBeVisible();

    // Switch to Dunning Cadences Tab
    const workflowsTab = page.getByRole("button", { name: /Dunning Cadences/i });
    await workflowsTab.click();
    await expect(page.getByText(/Autonomous Dunning Cadences/i)).toBeVisible();
    await expect(page.getByText(/T\+45 DAYS/i)).toBeVisible();

    // Switch to MSME 3x Interest Tab
    const msmeTab = page.getByRole("button", { name: /MSME 3x Interest/i });
    await msmeTab.click();
    await expect(page.getByText(/Section 15 & 16 MSMED Act 2006 Penal Interest Engine/i)).toBeVisible();
    await expect(page.getByText(/Calculated Penal Interest/i)).toBeVisible();

    // Switch to UPI & Payment Links Tab
    const paymentTab = page.getByRole("button", { name: /UPI & Payment Links/i });
    await paymentTab.click();
    await expect(page.getByText(/Dynamic 1-Click Payment Links & Webhook Settlement/i)).toBeVisible();
    await expect(page.getByText(/UPI QR CODE/i)).toBeVisible();
  });

  test("pricing section toggles between Monthly and Annual billing discounts", async ({ page }) => {
    await page.goto("/");

    // Pricing Section
    await expect(
      page.getByRole("heading", { name: /Simple, predictable plans for growing businesses/i })
    ).toBeVisible();

    // Default is Annual with 20% savings badge
    await expect(page.getByText(/Save 20%/i)).toBeVisible();

    // Toggle to Monthly
    const monthlyBtn = page.getByRole("button", { name: /^Monthly$/i });
    await monthlyBtn.click();

    // Toggle back to Annual
    const annualBtn = page.getByRole("button", { name: /Annual/i });
    await annualBtn.click();
    await expect(page.getByText(/Save 20%/i)).toBeVisible();
  });

  test("renders privacy policy and terms of service legal pages", async ({ page }) => {
    // Privacy policy page
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy", exact: true })).toBeVisible();
    await expect(page.getByText(/Digital Personal Data Protection/i)).toBeVisible();

    // Terms of service page
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service", exact: true })).toBeVisible();
    await expect(page.getByText(/MSMED Act 2006/i)).toBeVisible();
  });
});
