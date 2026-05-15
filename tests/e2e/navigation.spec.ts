import { test, expect } from '@playwright/test';

// Define some mocked user data to simulate a logged-in user
const mockedUser = {
  steamid: '12345678901234567',
  username: 'TestUser',
  avatar: 'https://avatars.steamstatic.com/test.jpg',
  role: 'user',
};

const mockedToken = 'fake-jwt-token';

test.describe('Navegación General', () => {
  // Use a beforeEach hook to inject localStorage before each test
  test.beforeEach(async ({ page, context }) => {
    // Inject mocked user into the browser context before any navigation
    await context.addInitScript(({ user, token }) => {
      localStorage.setItem('steamates_user', JSON.stringify(user));
      localStorage.setItem('steamates_token', token);
    }, { user: mockedUser, token: mockedToken });

    // Mock the auth API to prevent redirect to Login on network failure
    await page.route('**/api/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: mockedUser })
      });
    });

    // Navigate to the app after localStorage is ready
    await page.goto('/');

    // Reload to ensure app reads the injected localStorage state if needed
    await page.reload();
  });

  test('debe poder navegar al Home y ver contenido básico', async ({ page }) => {
    // Navigate to Home
    await page.goto('/');
    
    // Verify navbar exists
    await expect(page.locator('nav').first()).toBeVisible();

    // Verify main content container exists
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('debe poder navegar a Mercado', async ({ page }) => {
    await page.goto('/market');
    
    // Check for some text or element that identifies the Market page
    // Using an h1 or some known text
    await expect(page.locator('h1', { hasText: 'Mercado' }).first()).toBeVisible();
  });

  test('debe poder navegar a Listas', async ({ page }) => {
    await page.goto('/lists');
    
    // Check for "Mis Listas" or generic list texts
    await expect(page.locator('h1', { hasText: 'Listas' }).first()).toBeVisible();
  });

  test('debe poder navegar a Amigos', async ({ page }) => {
    await page.goto('/friends');
    
    // Wait for network requests or skeleton loading
    await expect(page.locator('h1', { hasText: 'Social' }).first()).toBeVisible();
  });

  test('debe poder navegar a Perfil', async ({ page }) => {
    await page.goto('/profile');
    
    // The profile page should show the username
    await expect(page.locator(`text=${mockedUser.username}`).first()).toBeVisible();
  });
});
