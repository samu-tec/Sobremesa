import { test, expect, type Page } from '@playwright/test';
import { accessibilityAudit } from './accessibility';

async function ready(page: Page, name = 'Ana') {
  await page.addInitScript((name) => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', name);
  }, name);
  await page.goto('/');
  await expect(page.locator('.connection')).toHaveAttribute('aria-label', 'Listo para jugar');
}

test('Dos personas: turno sincronizado, reconexión, resultado y cambio de juego', async ({
  page,
  browser,
}) => {
  await ready(page);
  await page.locator('.game-tictactoe .play-friends').click();
  const code = (await page.locator('.room-code-text').innerText()).trim();
  const context = await browser.newContext();
  try {
    const guest = await context.newPage();
    await ready(guest, 'Bruno');
    await guest.goto(`/?room=${code}`);
    await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
    await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await page.locator('.ttt-board button').nth(0).click();
    await expect(guest.locator('.ttt-board .cell-x')).toHaveCount(1);
    await guest.locator('.ttt-board button').nth(3).click();
    await expect(
      page.getByRole('button', { name: 'Fila 2, columna 1: O', exact: true }),
    ).toBeVisible();
    await guest.reload();
    await expect(
      guest.getByRole('button', { name: 'Fila 2, columna 1: O', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.table-player').filter({ hasText: 'Bruno' })).not.toContainText(
      'Turno automático',
    );
    await expect(guest.locator('.ttt-board .cell-x')).toHaveCount(1);
    for (const [client, cell] of [
      [page, 1],
      [guest, 4],
      [page, 2],
    ] as const)
      await client.locator('.ttt-board button').nth(cell).click();
    await expect(page.locator('.result-content')).toBeVisible();
    await page.getByRole('button', { name: 'Preparar otra partida', exact: true }).click();
    await page.getByRole('button', { name: 'Cambiar juego', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Buscar juegos', exact: true }).fill('chess');
    await page.locator('.room-game-option[data-game-id="chess"]').click();
    await expect(guest.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await expect(page.locator('.chess-board')).toBeVisible();
    await expect(guest.locator('.chess-board')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('Móvil: sala, preferencias y reglas accesibles sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.locator('.game-colorclash .play-bot').click();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Sonido', exact: true })).toBeChecked();
  await expect(page.getByRole('slider', { name: 'Volumen' })).toHaveValue('25');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.color-table')).toBeVisible();
  await page.getByRole('button', { name: 'Reglas', exact: true }).click();
  // Contrast must be measured after the dialog's entrance opacity has settled.
  await page.locator('.modal-backdrop').evaluate((backdrop) =>
    Promise.all(
      backdrop
        .getAnimations({ subtree: true })
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  expect((await accessibilityAudit(page).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
