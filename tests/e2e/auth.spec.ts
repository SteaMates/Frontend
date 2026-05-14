import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test('debe mostrar la página de login y el botón de iniciar sesión', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Bienvenido').first()).toBeVisible();
    await expect(page.locator('button', { hasText: 'Iniciar Sesión con Steam' })).toBeVisible();
  });

  test('si el usuario está baneado debe mostrar el modal de error', async ({ page }) => {
    await page.goto('/login?error=user_banned&reason=Toxic+behavior');

    await expect(page.locator('text=Cuenta baneada')).toBeVisible();
    await expect(page.locator('text=Toxic behavior').first()).toBeVisible();

    await page.click('button:has-text("Entendido")');
    await expect(page.locator('text=Cuenta baneada')).toBeHidden();
  });
});
