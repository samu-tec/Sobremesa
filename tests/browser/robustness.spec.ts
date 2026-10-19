import { test, expect, type Page } from '@playwright/test';
import { accessibilityAudit } from './accessibility';

async function ready(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', 'Ana');
  });
  await page.goto('/');
  await expect(page.getByText('Listo para jugar', { exact: true })).toBeVisible();
}

test('Ciudad Fortuna sincroniza el tamaño aunque cambie antes de suscribirse', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    let first = true;
    window.matchMedia = (query: string) => {
      const result = original(query);
      if (query === '(max-width: 900px)' && first) {
        first = false;
        // Reproduce a stale render snapshot before the effect subscribes at the new width.
        Object.defineProperty(result, 'matches', { value: false });
      }
      return result;
    };
  });
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.city-mobile-players > button')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Tirar dados', exact: true })).toBeInViewport({
    ratio: 1,
  });
});

test('Un protocolo incompatible informa y solo recarga por decisión del jugador', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', 'Ana');
  });
  // Socket.IO sends namespace authentication in its first polling POST.
  // Change only the public protocol field; never log or alter the session secret.
  await page.route('**/socket.io/**', (route) => {
    const body = route.request().postData();
    return body?.includes('"protocolVersion":')
      ? route.continue({ postData: body.replace(/"protocolVersion":\d+/, '"protocolVersion":999') })
      : route.continue();
  });
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Hay una nueva versión de Sobremesa');
  const token = await page.evaluate(() => sessionStorage.getItem('sobremesa.session'));
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  await page.unroute('**/socket.io/**');
  await dialog.getByRole('button', { name: 'Recargar la página', exact: true }).click();
  await expect(page.getByText('Listo para jugar', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('sobremesa.session'))).toBe(token);
});

test('El diálogo aísla el fondo, contiene Tab y restaura el foco al cerrar', async ({ page }) => {
  await ready(page);
  const trigger = page.getByRole('button', { name: 'Cómo funciona', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#root')).toHaveJSProperty('inert', true);
  await page.locator('#root .topbar-profile').evaluate((node: HTMLElement) => node.focus());
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('#root')).toHaveJSProperty('inert', false);
});

test('Una descarga de tablero fallida permite recargar conservando sesión y sala', async ({
  page,
}) => {
  await ready(page);
  const blocked = '**/assets/TresEnRayaBoard-*.js';
  await page.route(blocked, (route) =>
    route.fulfill({ status: 404, headers: { 'Cache-Control': 'no-store' }, body: '' }),
  );
  await page
    .getByRole('button', { name: 'Jugar a Tres en Raya contra un bot', exact: true })
    .click();
  await expect(page.locator('.room-code-text')).toHaveText(/^[A-HJ-NP-Z2-9]{6}$/);
  const session = await page.evaluate(() => ({
    token: sessionStorage.getItem('sobremesa.session'),
    room: sessionStorage.getItem('sobremesa.room'),
  }));
  expect(session.room).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No se ha podido cargar una parte de Sobremesa.' }),
  ).toBeFocused();
  await expect(
    page.getByText(
      'Puede haber una actualización o un problema de conexión. Recarga cuando quieras; tu sesión se conserva.',
    ),
  ).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('sobremesa.session'))).toBe(
    session.token,
  );
  await page.unroute(blocked);
  await page.getByRole('button', { name: 'Recargar la página', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tres en Raya.', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('sobremesa.room'))).toBe(session.room);
  expect(await page.evaluate(() => sessionStorage.getItem('sobremesa.session'))).toBe(
    session.token,
  );
});

for (const width of [320, 375, 390, 768, 1280])
  test(`Catálogo y formulario de sala a ${width}px, WCAG 2.2 y teclado`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.locator('.game-tictactoe .play-friends').click();
    await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeDisabled();
    // A valid code with the widest letters exposed an intermittent min-content overflow.
    await page.locator('.room-code-text').evaluate((node) => {
      node.textContent = 'WWWWWW';
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const results = await accessibilityAudit(page).analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    const cell = page.getByRole('button', { name: 'Fila 1, columna 1: vacía', exact: true });
    await cell.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Fila 1, columna 1: X', exact: true }),
    ).toBeVisible();
  });
