import { expect, test } from "@playwright/test";

test.describe("Smart Waitlist (public surface)", () => {
  test("landing hero and signup form render", async ({ page }) => {
    await page.goto("/");

    const hero = page.getByTestId("landing-hero");
    await expect(hero).toBeVisible();
    await expect(hero.getByText("Skip the line.")).toBeVisible();
    await expect(page.getByTestId("signup-form")).toBeVisible();
    await expect(page.getByRole("button", { name: /join the waitlist/i })).toBeVisible();
  });

  test("how-it-works section is present", async ({ page }) => {
    await page.goto("/");

    const section = page.getByTestId("how-it-works");
    await expect(section).toBeVisible();
    await expect(section.getByText("Join the waitlist")).toBeVisible();
    await expect(section.getByText("Share your link")).toBeVisible();
    await expect(section.getByText("Climb the queue")).toBeVisible();
  });

  test("sign-in page renders", async ({ page }) => {
    await page.goto("/signin");

    const form = page.getByTestId("signin-form");
    await expect(form).toBeVisible();
    await expect(form.getByText("Welcome back")).toBeVisible();
    await expect(form.getByLabel(/email/i)).toBeVisible();
  });

  test("unauthenticated /dashboard redirects home", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/(\?|$)/);
    await expect(page.getByTestId("landing-hero")).toBeVisible();
  });

  test("unknown routes show a 404", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByTestId("not-found")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
