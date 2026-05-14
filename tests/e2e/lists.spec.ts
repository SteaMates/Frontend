import { test, expect } from '@playwright/test';

const mockedUser = {
  steamid: '12345678901234567',
  username: 'TestUser',
  avatar: 'https://avatars.steamstatic.com/test.jpg',
  role: 'user',
};

const mockedToken = 'fake-jwt-token';

test.describe('Listas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(({ user, token }) => {
      localStorage.setItem('steamates_user', JSON.stringify(user));
      localStorage.setItem('steamates_token', token);
    }, { user: mockedUser, token: mockedToken });

    await page.goto('/lists');
  });

  test('debe cargar la vista general de listas', async ({ page }) => {
    // Just verify the main container is present and title is present
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Playwright best practice: Use .first() if multiple matches exist, or a more specific locator.
    const createBtn = page.locator('button', { hasText: 'Crear Lista' }).first();
    await expect(createBtn).toBeVisible();
  });

  test('debe abrir el modal para crear nueva lista', async ({ page }) => {
    const createBtn = page.locator('button', { hasText: 'Crear Lista' }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    await expect(page.locator('text=Crear Nueva Lista').first()).toBeVisible();
    
    await page.click('button:has-text("Cancelar")');
  });
});
