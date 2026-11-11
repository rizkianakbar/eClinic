import { expect, test } from "@playwright/test";

test("redirects signed-out users to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("shows an error for wrong credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("dokter@klinik.test");
  await page.getByLabel("Kata sandi").fill("salah");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Email atau kata sandi salah")).toBeVisible();
});

test("signs in, shows role navigation, and signs out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("dokter@klinik.test");
  await page.getByLabel("Kata sandi").fill("password123");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Selamat datang, dr. Budi Santoso" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Beranda" })).toBeVisible();

  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
