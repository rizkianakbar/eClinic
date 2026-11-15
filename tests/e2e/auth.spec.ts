import { expect, test } from '@playwright/test';

// The demo clinic (baseURL) and its seeded test accounts (scripts/seed-test-data.ts).
const PASSWORD = 'UjiKlinik#2026';

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata sandi').fill(PASSWORD);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
}

test('redirects signed-out users to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('shows an error for wrong credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('dokter.umum.uji@klinik.test');
  await page.getByLabel('Kata sandi').fill('salah-sekali');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByText('Email atau kata sandi salah')).toBeVisible();
});

test('a doctor signs in to their workstation and signs out', async ({ page }) => {
  await signIn(page, 'dokter.umum.uji@klinik.test');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('dr. Budi Santoso');

  await page.getByRole('button', { name: /akun/i }).first().click();
  await page.getByRole('menuitem', { name: /Keluar/ }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('front desk lands on its station', async ({ page }) => {
  await signIn(page, 'resepsionis.uji@klinik.test');

  await expect(page).toHaveURL(/\/registration$/);
});

test('Akun saya names the organization', async ({ page }) => {
  await signIn(page, 'pemilik.uji@klinik.test');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  await page.goto('/account');

  // The route's loading frame draws the same card while the page streams in: either one names the organization.
  await expect(page.locator('dt', { hasText: 'Instansi' }).first()).toBeVisible();
});
