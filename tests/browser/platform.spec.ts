import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const games = [
  'Ciudad Fortuna',
  'Cambio de Color',
  'Cuatro en Línea',
  'Reversi',
  'Tres en Raya',
  'Dados al 100',
];
async function ready(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', localStorage.getItem('sobremesa.name') || 'Ana');
  });
  await page.goto('/');
  await expect(page.getByText('Listo para jugar', { exact: true })).toBeVisible();
}

test('Catálogo, alias, categorías y favoritos', async ({ page }) => {
  await ready(page);
  await expect(page.locator('.game-card')).toHaveCount(6);
  const search = page.getByRole('searchbox', { name: 'Buscar juegos' });
  await search.fill('monopoly');
  await expect(page.locator('.game-card')).toHaveCount(1);
  await expect(page.locator('.game-card h3')).toHaveText('Ciudad Fortuna');
  await search.fill('uno');
  await expect(page.locator('.game-card h3')).toHaveText('Cambio de Color');
  await search.fill('inexistente');
  await expect(page.getByText('No encontramos ese juego', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver todos los juegos', exact: true }).click();
  await page
    .getByRole('button', { name: 'Añadir Ciudad Fortuna a favoritos', exact: true })
    .click();
  await page.getByRole('button', { name: 'Mis favoritos', exact: true }).click();
  await expect(page.locator('.game-card')).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Quitar Ciudad Fortuna de favoritos', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reglas de Ciudad Fortuna', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('no hay límite de rondas');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Nombre, diálogo por teclado y preferencias', async ({ page }) => {
  await ready(page);
  await page.locator('.topbar-profile').click();
  const nameInput = page.getByRole('textbox', { name: 'Tu nombre', exact: true });
  await nameInput.clear();
  await nameInput.pressSequentially('Ana');
  await expect(nameInput).toBeFocused();
  await page.getByRole('button', { name: 'Guardar nombre', exact: true }).click();
  await page.reload();
  await expect(page.locator('.topbar-profile')).toContainText('Ana');
  await page.getByRole('button', { name: 'Cómo funciona', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Cerrar diálogo' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
});

for (const name of games)
  test(`${name}: bot, tablero, reglas y retorno`, async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: `Jugar a ${name} contra un bot`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await expect(page.getByRole('heading', { name: `${name}.`, exact: true })).toBeVisible();
    await expect(page.getByText('Es tu turno', { exact: true })).toBeVisible();
    await expect(page.getByText('¡Te toca!', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reglas', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(name);
    await page.keyboard.press('Escape');
    if (name === 'Ciudad Fortuna') {
      await page.getByRole('button', { name: 'Tirar dados', exact: true }).click();
      await expect(page.locator('.city-activity')).toContainText(
        /cayó|cárcel|Suerte|Comunidad|SALIDA|dobles|compró|pagó|Al sacar/,
      );
      await page.locator('.city-tile').nth(1).click();
      await expect(page.getByRole('dialog')).toContainText('Alquileres');
      await page.keyboard.press('Escape');
    }
    if (name === 'Tres en Raya') {
      await page.getByRole('button', { name: 'Fila 1, columna 1: vacía', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Fila 1, columna 1: X', exact: true }),
      ).toBeVisible();
    }
    if (name === 'Cuatro en Línea') {
      await page
        .getByRole('button', { name: 'Dejar caer ficha en columna 4', exact: true })
        .click();
      await expect(page.locator('.connect-hole.disc-0')).toHaveCount(1);
    }
    if (name === 'Reversi') {
      await page
        .getByRole('button', { name: 'Fila 3, columna 4: jugada válida', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Fila 3, columna 4: oscura', exact: true }),
      ).toBeVisible();
    }
    if (name === 'Dados al 100') {
      await page.getByRole('button', { name: 'Tirar dado', exact: true }).click();
      await expect(page.locator('.board-instruction')).not.toContainText('El primero');
    }
    if (name === 'Cambio de Color') {
      const cards = page.locator('.hand-card:not([disabled])');
      if (await cards.count()) {
        await cards.first().click();
        if (await page.locator('.color-choice-panel').count())
          await page.locator('.color-choice-panel').getByRole('button', { name: /Rojo/ }).click();
      } else await page.getByRole('button', { name: /Robar una carta/ }).click();
    }
    const a11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
      [],
    );
    await page.reload();
    await expect(page.getByRole('heading', { name: `${name}.`, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Salir de la partida', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Salir de la partida', exact: true })
      .click();
    await expect(page.locator('.game-card')).toHaveCount(6);
  });

test('Dos navegadores juegan, terminan y preparan revancha', async ({ page, browser }) => {
  await ready(page);
  await page
    .locator('.game-tictactoe')
    .getByRole('button', { name: 'Jugar con amigos', exact: true })
    .click();
  const code = (await page.locator('.room-code-text').innerText()).trim();
  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.addInitScript(() => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', 'Bruno');
  });
  await guest.goto(`http://127.0.0.1:3187/?room=${code}`);
  await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
  await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(guest.getByRole('heading', { name: 'Tres en Raya.', exact: true })).toBeVisible();
  for (const [current, index] of [
    [page, 0],
    [guest, 3],
    [page, 1],
    [guest, 4],
    [page, 2],
  ] as const) {
    await current
      .getByRole('button', {
        name: `Fila ${Math.floor(index / 3) + 1}, columna ${(index % 3) + 1}: vacía`,
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole('dialog')).toContainText('¡La victoria es tuya!');
  await expect(guest.getByRole('dialog')).toContainText('¡Tenemos un ganador!');
  await page.getByRole('button', { name: 'Preparar revancha', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeVisible();
  await expect(guest.getByText('El anfitrión iniciará la partida.', { exact: true })).toBeVisible();
  await context.close();
});

test('Un enlace a otra sala tiene prioridad sobre una sala guardada al reabrir la pestaña', async ({
  page,
  browser,
}) => {
  await ready(page);
  await page
    .locator('.game-tictactoe')
    .getByRole('button', { name: 'Jugar con amigos', exact: true })
    .click();
  const previousCode = (await page.locator('.room-code-text').innerText()).trim();
  const previousSession = await page.evaluate(() => ({
    token: sessionStorage.getItem('sobremesa.session'),
    playerId: sessionStorage.getItem('sobremesa.playerId'),
    room: sessionStorage.getItem('sobremesa.room'),
  }));
  await page.close();

  const hostContext = await browser.newContext();
  const host = await hostContext.newPage();
  await ready(host);
  await host
    .locator('.game-tictactoe')
    .getByRole('button', { name: 'Jugar con amigos', exact: true })
    .click();
  const inviteCode = (await host.locator('.room-code-text').innerText()).trim();
  expect(inviteCode).not.toBe(previousCode);

  const resumed = await page.context().newPage();
  await resumed.addInitScript((saved) => {
    if (saved.token) sessionStorage.setItem('sobremesa.session', saved.token);
    if (saved.playerId) sessionStorage.setItem('sobremesa.playerId', saved.playerId);
    if (saved.room) sessionStorage.setItem('sobremesa.room', saved.room);
  }, previousSession);
  await resumed.goto(`/?room=${inviteCode}`);
  await resumed.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
  await expect(host.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
  expect(await resumed.evaluate(() => sessionStorage.getItem('sobremesa.room'))).toBe(inviteCode);

  await resumed.getByRole('button', { name: 'Volver a los juegos', exact: true }).click();
  await host.getByRole('button', { name: 'Volver a los juegos', exact: true }).click();
  await hostContext.close();
});

test('Escritorio, tablet y móvil sin desbordamiento horizontal', async ({ page }) => {
  for (const width of [1440, 1024, 768, 600, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `Catálogo a ${width}px`,
    ).toBe(true);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `tests/.output/screenshots/preview-${width === 1440 ? 'desktop' : 'mobile'}.png`,
        fullPage: true,
        animations: 'disabled',
      });
  }
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.city-board')).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `Tablero a ${width}px`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'tests/.output/screenshots/preview-city-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('Accesibilidad del catálogo y el diálogo de reglas', async ({ page }) => {
  await ready(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Reglas de Ciudad Fortuna', exact: true }).click();
  const rules = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(rules.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
});

test('Primera visita: idioma, apodo aleatorio, persistencia y privacidad', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('sobremesa.locale')) localStorage.setItem('sobremesa.locale', 'es');
  });
  await page.goto('/');
  const welcome = page.getByRole('dialog');
  await expect(welcome).toContainText('Bienvenido a Sobremesa');
  await welcome.getByRole('combobox', { name: 'Idioma' }).selectOption('en');
  await expect(welcome).toContainText('Welcome to Sobremesa');
  await welcome.getByRole('button', { name: 'Random name', exact: true }).click();
  await expect(welcome.getByRole('textbox', { name: 'Your name', exact: true })).not.toHaveValue(
    '',
  );
  await welcome.getByRole('textbox', { name: 'Your name', exact: true }).fill('Suerte');
  await welcome.getByRole('button', { name: 'Enter Sobremesa', exact: true }).click();
  await expect(page.locator('.game-card')).toHaveCount(6);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.game-card h3').first()).toHaveText('Fortune City');
  await page.getByRole('searchbox', { name: 'Search games' }).fill('monopoly');
  await expect(page.locator('.game-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.topbar-profile')).toContainText('Suerte');
  await page.getByRole('link', { name: 'Privacy and use', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Who is responsible and how to get in touch', exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('contacto@samuelciocan.com');
});

for (const [spanish, english] of [
  ['Ciudad Fortuna', 'Fortune City'],
  ['Cambio de Color', 'Colour Switch'],
  ['Cuatro en Línea', 'Four in a Row'],
  ['Reversi', 'Reversi'],
  ['Tres en Raya', 'Tic-tac-toe'],
  ['Dados al 100', 'Race to 100'],
])
  test(`${english}: configuración y reglas en inglés, cambio de idioma durante la partida`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sobremesa.locale', 'en');
      localStorage.setItem('sobremesa.name', 'Suerte');
      localStorage.setItem('sobremesa.profileConfirmed', 'true');
    });
    await page.goto('/');
    await page.getByRole('button', { name: `Play ${english} against a bot`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start game', exact: true })).toBeVisible();
    await expect(page.locator('.city-board, .color-table, .play-area')).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Time per turn' }).selectOption('60');
    if (english === 'Fortune City') {
      await expect(page.getByRole('combobox', { name: 'Round limit' })).toHaveValue('unlimited');
      await page.getByRole('combobox', { name: 'Round limit' }).selectOption('60');
      await page.getByRole('switch', { name: 'Collect rent while in jail', exact: true }).uncheck();
      await expect(
        page.getByRole('switch', { name: 'Collect rent while in jail', exact: true }),
      ).not.toBeChecked();
      await page.getByRole('combobox', { name: 'Starting cash' }).selectOption('2000');
    }
    if (english === 'Colour Switch')
      await page.getByRole('combobox', { name: 'Starting hand' }).selectOption('9');
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page.getByRole('heading', { name: `${english}.`, exact: true })).toBeVisible();
    await expect(page.getByRole('timer')).toContainText(/0:5\d|1:00/);
    if (english === 'Colour Switch') await expect(page.locator('.hand-card')).toHaveCount(9);
    await page.getByRole('button', { name: 'Rules', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(`How to play · ${english}`);
    await expect(page.getByRole('dialog')).not.toContainText('jugadores');
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Language' }).selectOption('es');
    await expect(page.getByRole('heading', { name: `${spanish}.`, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    if (english === 'Fortune City')
      await expect(page.locator('.city-player').first()).toContainText('2000');
  });

test('Ciudad Fortuna: tablero orientado, fichas y acciones accesibles sin desplazarse', async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  const first = await page
    .locator('.city-tile')
    .first()
    .evaluate((node) => ({ row: node.style.gridRow, column: node.style.gridColumn }));
  const next = await page
    .locator('.city-tile')
    .nth(1)
    .evaluate((node) => ({ row: node.style.gridRow, column: node.style.gridColumn }));
  expect(first).toEqual({ row: '1', column: '1' });
  expect(next).toEqual({ row: '1', column: '2' });
  await expect(page.locator('.tile-tokens .player-piece')).toHaveCount(2);
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [390, 844],
    [320, 700],
    [844, 390],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByRole('button', { name: 'Tirar dados', exact: true })).toBeInViewport({
      ratio: 1,
    });
    await expect(page.locator('.city-board')).toBeInViewport({ ratio: 1 });
    if (width === 390 || width === 1440 || width === 844)
      await page.screenshot({
        path: `tests/.output/screenshots/city-${width}.png`,
        fullPage: true,
      });
    if (width <= 900) {
      await expect(
        page.getByRole('button', { name: 'Ampliar tablero', exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await expect(
        page.getByRole('button', { name: 'Jugadores y propiedades', exact: true }),
      ).toBeInViewport({ ratio: 1 });
    }
  }
  await page.getByRole('button', { name: 'Ampliar tablero', exact: true }).click();
  await expect(page.locator('.board-zoomed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tirar dados', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await page.getByRole('button', { name: 'Ver tablero completo', exact: true }).click();
  await page.getByRole('button', { name: 'Jugadores y propiedades', exact: true }).click();
  await expect(page.locator('.city-sidebar')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.city-sidebar')).not.toBeVisible();
});

test('Cambio de Color: el selector deja la mano visible y permite comparar colores', async ({
  page,
}) => {
  // A deterministic incoming public state exercises the chooser without changing the server engine.
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (typeof message === 'string' && message.startsWith('42')) {
        try {
          const packet = JSON.parse(message.slice(2));
          if (packet[0] === 'game:started' && packet[1].gameType === 'colorclash') {
            packet[1].publicState.myHand[0] = {
              ...packet[1].publicState.myHand[0],
              color: 'wild',
              value: 'wild',
            };
            route.send('42' + JSON.stringify(packet));
            return;
          }
        } catch {
          /* Other Socket.IO packets pass through. */
        }
      }
      route.send(message);
    });
  });
  await ready(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Jugar a Cambio de Color contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await page.locator('.hand-card').first().click();
  await expect(page.locator('.color-choice-panel')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.your-hand')).toBeInViewport();
  await expect(page.locator('.color-choices button')).toHaveCount(4);
  await expect(page.locator('.color-choices button').first()).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations.map((v) => v.id)).toEqual([]);
  await page.screenshot({
    path: 'tests/.output/screenshots/color-choice-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.color-choice-panel')).toHaveCount(0);
});

test('Una caída de red conserva la misma sala y el estado al volver', async ({ page, context }) => {
  test.setTimeout(50000);
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Tres en Raya contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await page.getByRole('button', { name: 'Fila 1, columna 1: vacía', exact: true }).click();
  const code = await page.locator('.header-actions button').first().innerText();
  await context.setOffline(true);
  await expect(page.locator('.offline-banner')).toBeVisible({ timeout: 25000 });
  await context.setOffline(false);
  await expect(page.locator('.offline-banner')).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator('.header-actions button').first()).toHaveText(code);
  await expect(
    page.getByRole('button', { name: 'Fila 1, columna 1: X', exact: true }),
  ).toBeVisible();
});

test('Ciudad Fortuna: seis jugadores conservan fichas distintas y controles visibles en móvil', async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
  for (let count = 3; count <= 6; count++) {
    await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
    await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(count);
  }
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.locator('.city-mobile-players > button')).toHaveCount(6);
  await expect(page.locator('.tile-tokens .player-piece')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Tirar dados', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await expect(
    page.getByRole('button', { name: 'Jugadores y propiedades', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: 'tests/.output/screenshots/city-six-players.png', fullPage: true });
});
