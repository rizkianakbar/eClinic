import { expect, test } from '@playwright/test';

// The root domain is the marketing site; a subdomain is a clinic (lib/tenant).
const SITE = 'http://localhost:3100';

test('the root domain shows the landing page and the signup form', async ({ page }) => {
  await page.goto(`${SITE}/`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Satu alur untuk setiap pasien');

  await page.getByRole('link', { name: 'Daftarkan klinik', exact: true }).first().click();
  await expect(page).toHaveURL(`${SITE}/signup`);

  // The subdomain follows the company name (generic words dropped), and the demo's address is not available.
  await page.getByLabel('Nama instansi').fill('Sentosa Medika Group');
  await expect(page.getByLabel('Alamat web')).toHaveValue('sentosa-medika');
  await expect(page.getByLabel('Nama cabang pertama')).toHaveValue('Cabang Utama');
  await page.getByLabel('Alamat web').fill('clinic');
  await expect(page.getByText('Alamat ini dipakai sistem')).toBeVisible();
});

test('an unclaimed subdomain is not found', async ({ page }) => {
  const response = await page.goto('http://belum-ada-klinik.localhost:3100/login');

  expect(response?.status()).toBe(404);
});

test('the marketing pages are not part of a clinic address', async ({ page }) => {
  const response = await page.goto('/site');

  expect(response?.status()).toBe(404);
});

test('the company pages are for the owner only', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('kasir.uji@klinik.test');
  await page.getByLabel('Kata sandi').fill('UjiKlinik#2026');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  await page.goto('/company');
  await expect(page).not.toHaveURL(/\/company/);
});

test('signup refuses an instant (bot-speed) submit', async ({ page }) => {
  await page.goto(`${SITE}/signup`);
  await page.getByLabel('Nama instansi').fill('Bot Medika Group');
  await page.getByLabel('Nama lengkap').fill('Bot');
  await page.getByLabel('Email').fill('bot@spam.test');
  await page.getByLabel('Kata sandi', { exact: true }).fill('bot-password-1');
  // The honeypot is filled, as bots do.
  await page.locator('input[name="website"]').fill('http://spam.test', { force: true });
  await page.getByRole('button', { name: 'Buat klinik' }).click();

  await expect(page.getByText('Klinik gagal dibuat')).toBeVisible();
  await expect(page).toHaveURL(`${SITE}/signup`);
});
