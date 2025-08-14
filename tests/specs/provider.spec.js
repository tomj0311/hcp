import { test, expect } from '@playwright/test';

// Assumes admin credentials for creating a provider

test.describe('Provider registration', () => {
  test('create new provider and see it in list', async ({ page }) => {
    test.slow();
    await page.goto('/login');
    await page.getByLabel('username').fill(process.env.ADMIN_USER || 'admin');
    await page.getByLabel('password').fill(process.env.ADMIN_PASS || '123');
    await page.getByLabel('login button').click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/register');
    await page.getByRole('button', { name: 'Provider' }).click();
    const name = `Dr Test ${Date.now()}`;
    await page.getByLabel('Name').fill(name);
    const email = `dr${Date.now()}@example.com`;
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Registered')).toBeVisible();

    // Back to dashboard to ensure provider appears (may not be first because of sorting)
    await page.goto('/');
    // Fetch all provider cards text and assert at least one contains name
    const cards = await page.getByLabel('provider list').locator('div').allInnerTexts();
    const found = cards.some(t => t.includes(name));
    expect(found).toBeTruthy();
  });
});
