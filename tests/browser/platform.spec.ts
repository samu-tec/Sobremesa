import { test, expect } from '@playwright/test';
import { accessibilityAudit } from './accessibility';
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
  await expect(page.locator('.connection')).toBeVisible();
  await expect(page.locator('.connection')).toHaveAttribute('aria-label', 'Listo para jugar');
}

test('Catálogo, búsqueda por nombre, categorías y favoritos', async ({ page }) => {
  await ready(page);
  await expect(page.locator('.game-card')).toHaveCount(30);
  const search = page.getByRole('searchbox', { name: 'Buscar juegos' });
  await search.fill('ciudad fortuna');
  await expect(page.locator('.game-card')).toHaveCount(1);
  await expect(page.locator('.game-card h3')).toHaveText('Ciudad Fortuna');
  await search.fill('cambio de color');
  await expect(page.locator('.game-card h3')).toHaveText('Cambio de Color');
  await search.fill('monopoly');
  await expect(page.locator('.game-card')).toHaveCount(0);
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
  await expect(page.locator('.profile-button')).toContainText('Ana');
  await expect(page.locator('.topbar .profile-button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  const nameInput = page.getByRole('textbox', { name: 'Tu nombre', exact: true });
  await nameInput.clear();
  await nameInput.pressSequentially('Alba');
  await expect(nameInput).toBeFocused();
  await page.getByRole('button', { name: 'Guardar nombre', exact: true }).click();
  await expect(page.locator('.profile-button')).toContainText('Alba');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('dialog')).toContainText('Preferencias');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('.profile-button')).toContainText('Alba');
  await page.getByRole('button', { name: 'Cómo funciona', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Cerrar diálogo' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
});

test('Reglas, preferencias y selector comparten ancho; jugadores y opciones quedan alineados', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  const modalWidth = async () =>
    page.getByRole('dialog').evaluate((dialog) => dialog.getBoundingClientRect().width);
  const widths: number[] = [];

  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  widths.push(await modalWidth());
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Reglas de Ciudad Fortuna', exact: true }).click();
  widths.push(await modalWidth());
  await page.keyboard.press('Escape');

  await page
    .locator('.game-monopoly')
    .getByRole('button', { name: 'Jugar con amigos', exact: true })
    .click();
  const players = page.locator('.waiting-players');
  await expect(players).toBeVisible();
  const alignment = await page.evaluate(() => {
    const players = document.querySelector('.waiting-players')!.getBoundingClientRect();
    const settings = document.querySelector('.room-settings')!.getBoundingClientRect();
    return {
      playerTop: players.top,
      settingTop: settings.top,
      playerWidth: players.width,
      settingWidth: settings.width,
    };
  });
  expect(Math.abs(alignment.playerTop - alignment.settingTop)).toBeLessThan(1);
  expect(Math.abs(alignment.playerWidth - alignment.settingWidth)).toBeLessThan(1);

  await page.getByRole('button', { name: 'Reglas', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Opciones de esta partida');
  widths.push(await modalWidth());
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Cambiar juego', exact: true }).click();
  widths.push(await modalWidth());
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
  await expect(page.getByRole('searchbox', { name: 'Buscar juegos', exact: true })).toBeVisible();
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
])
  test(`Cambiar de apartado empieza arriba (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await ready(page);
    const play = page
      .locator('.game-monopoly')
      .getByRole('button', { name: 'Jugar con amigos', exact: true });
    await play.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await play.click();
    await expect(page.locator('.waiting-intro h1')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
    await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
    await page
      .getByRole('switch', { name: 'Construcción equilibrada', exact: true })
      .scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    // The sticky header remains visible at the current scroll position; use a real click so
    // the application listener runs the same way it does for a player.
    await page.getByRole('button', { name: 'Volver a los juegos', exact: true }).click();
    await expect(page.locator('.game-card')).toHaveCount(30);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

for (const name of games)
  test(`${name}: bot, tablero, reglas y retorno`, async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: `Jugar a ${name} contra un bot`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await expect(page.getByRole('heading', { name: `${name}.`, exact: true })).toBeVisible();
    await expect(page.getByText('Es tu turno', { exact: true })).toBeVisible();
    await expect(page.getByText('¡Te toca!', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Reglas', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(name);
    await page.keyboard.press('Escape');
    if (name === 'Ciudad Fortuna') {
      await page.getByRole('button', { name: 'Tirar dados', exact: true }).click();
      await expect(page.locator('.city-event-banner')).toContainText(
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
    const a11y = await accessibilityAudit(page).analyze();
    expect(a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
      [],
    );
    const resultDialog = page.getByRole('dialog').filter({ has: page.locator('.result-content') });
    if (await resultDialog.isVisible())
      await resultDialog.getByRole('button', { name: 'Ver la mesa', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: `${name}.`, exact: true })).toBeVisible();
    const resultAfterReload = page
      .getByRole('dialog')
      .filter({ has: page.locator('.result-content') });
    if (await resultAfterReload.isVisible())
      await resultAfterReload.getByRole('button', { name: 'Ver la mesa', exact: true }).click();
    await page.getByRole('button', { name: 'Salir de la partida', exact: true }).click();
    const leaveConfirmation = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Salir de la partida', exact: true });
    if (await leaveConfirmation.isVisible()) await leaveConfirmation.click();
    await expect(page.locator('.game-card')).toHaveCount(30);
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
  await guest.goto(`${new URL(page.url()).origin}/?room=${code}`);
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
  await expect(page.getByRole('dialog')).toContainText('¡Has ganado!');
  await expect(guest.getByRole('dialog')).toContainText('Partida terminada');
  await page.getByRole('button', { name: 'Preparar otra partida', exact: true }).click();
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
  for (const width of [1440, 1280, 1024, 768, 600, 390, 375, 360, 320]) {
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
  const results = await accessibilityAudit(page).analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Reglas de Ciudad Fortuna', exact: true }).click();
  const rules = await accessibilityAudit(page).analyze();
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
  await welcome.getByRole('button', { name: 'Preferencias', exact: true }).click();
  const preferences = page.getByRole('dialog', { name: 'Preferencias', exact: true });
  await preferences.getByRole('button', { name: 'Inglés', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(welcome).toContainText('Welcome to Sobremesa');
  await expect(
    welcome.getByRole('link', { name: 'Read the privacy policy', exact: true }),
  ).toHaveAttribute('href', '/privacy');
  await expect(welcome.locator('input[type="checkbox"]')).toHaveCount(0);
  await welcome.getByRole('link', { name: 'Read the privacy policy', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Who is responsible and how to get in touch', exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(welcome).toContainText('Welcome to Sobremesa');
  await welcome.getByRole('button', { name: 'Random name', exact: true }).click();
  await expect(welcome.getByRole('textbox', { name: 'Your name', exact: true })).not.toHaveValue(
    '',
  );
  await welcome.getByRole('textbox', { name: 'Your name', exact: true }).fill('Suerte');
  await welcome.getByRole('button', { name: 'Enter Sobremesa', exact: true }).click();
  await expect(page.locator('.game-card')).toHaveCount(30);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.game-card h3').first()).toHaveText('Fortune City');
  await page.getByRole('searchbox', { name: 'Search games' }).fill('fortune city');
  await expect(page.locator('.game-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.profile-button')).toContainText('Suerte');
  await page.getByRole('link', { name: 'Privacy and use', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Who is responsible and how to get in touch', exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('contacto@samuelciocan.com');
  await expect(page.locator('main')).toContainText('does not generate access logs');
  await expect(page.getByRole('link', { name: 'Source code terms', exact: true })).toHaveAttribute(
    'href',
    '/license.txt',
  );
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
    if (english === 'Four in a Row') {
      await expect(
        page.getByRole('img', { name: 'Row 1, column 1: empty', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Drop a disc in column 1', exact: true }).click();
      await expect(
        page.getByRole('img', { name: 'Row 6, column 1: Suerte’s disc', exact: true }),
      ).toBeVisible();
    }
    if (english === 'Reversi') {
      await expect(
        page.getByRole('button', { name: 'Row 1, column 1: empty', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Row 3, column 4: legal move', exact: true }),
      ).toBeEnabled();
    }
    await page.getByRole('button', { name: 'Rules', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(`How to play · ${english}`);
    await expect(page.getByRole('dialog')).not.toContainText('jugadores');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await page.getByRole('button', { name: 'Spanish', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `${spanish}.`, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    if (english === 'Fortune City')
      await expect(page.locator('.players-panel .table-player').first()).toContainText('2000');
  });

test('Ciudad Fortuna: tablero orientado, fichas separadas y controles accesibles', async ({
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
  await expect(page.locator('.city-token .player-piece')).toHaveCount(2);
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
    await page.getByRole('button', { name: 'Tirar dados', exact: true }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Tirar dados', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Tirar dados', exact: true })).toBeInViewport({
      ratio: 1,
    });
    await expect(page.locator('.city-board')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    if (width === 390 || width === 1440 || width === 844)
      await page.screenshot({
        path: `tests/.output/screenshots/city-${width}.png`,
        fullPage: true,
      });
    await expect(page.locator('.city-tile:not(.corner-tile) .tile-name').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ampliar tablero', exact: true })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Propiedades', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Propiedades', exact: true })).toBeVisible();
  await expect(page.locator('.city-management .portfolio')).toBeVisible();
  await expect(page.locator('.management-tabs')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Ciudad Fortuna: accesos fijos, tres movimientos recientes y escritorio sin scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (typeof message === 'string' && message.startsWith('42')) {
        const packet = JSON.parse(message.slice(2));
        if (packet[0] === 'game:started') {
          const state = packet[1].publicState;
          state.players[0].inJail = true;
          state.players[0].getOutOfJailFreeCards = 1;
          state.logs = [
            { key: '{0} cayó en "{1}".', values: ['Ana', { term: 'Gran Vía' }] },
            { key: '⚖️ {0} pagó {1}€ de impuestos.', values: ['Leo', 50] },
            { key: '{0} pasó por Salida y cobró {1}€.', values: ['Ana', 200] },
          ];
          route.send(`42${JSON.stringify(packet)}`);
          return;
        }
      }
      route.send(message);
    });
  });
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();

  const recent = page.locator('.city-recent-moves li');
  await expect(recent).toHaveCount(3);
  await expect(recent.first()).toContainText('Ana');
  await expect(page.locator('.city-center h2')).toHaveCount(0);
  await expect(page.locator('.play-title h1')).toContainText('Ciudad Fortuna');

  const tools = page.locator('.city-fixed-tools .city-fixed-tool');
  await expect(tools).toHaveCount(3);
  const geometry = await page.evaluate(() => {
    const actions = document.querySelector('.game-actions-panel')!.getBoundingClientRect();
    const players = document.querySelector('.players-panel')!.getBoundingClientRect();
    const nav = document.querySelector('.city-fixed-tools')!.getBoundingClientRect();
    const controls = [...document.querySelectorAll('.city-action-buttons > button')].map((button) =>
      button.getBoundingClientRect(),
    );
    return {
      actionWidth: actions.width,
      playerWidth: players.width,
      navBottom: nav.bottom,
      controlsTop: Math.min(...controls.map((box) => box.top)),
      controlWidths: controls.map((box) => box.width),
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: document.documentElement.clientHeight,
    };
  });
  expect(geometry.playerWidth).toBeGreaterThanOrEqual(250);
  expect(Math.abs(geometry.actionWidth - geometry.playerWidth)).toBeLessThan(2);
  expect(geometry.navBottom).toBeLessThan(geometry.controlsTop);
  expect(Math.max(...geometry.controlWidths) - Math.min(...geometry.controlWidths)).toBeLessThan(1);
  expect(geometry.documentHeight).toBeLessThanOrEqual(geometry.viewportHeight);

  await page.getByRole('button', { name: 'Actividad', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Actividad', exact: true })).toBeVisible();
  await expect(page.locator('.city-management .city-log')).toBeVisible();
  await expect(page.locator('.management-tabs')).toHaveCount(0);
  await expect(page.locator('.city-log')).toContainText('Gran Vía');
  await expect(page.locator('.city-log')).toContainText('50');
  await expect(page.locator('.city-log')).toContainText('200');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Propiedades', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Propiedades', exact: true })).toBeVisible();
  await expect(page.locator('.city-management .trade-form')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tratos', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tratos', exact: true })).toBeVisible();
  await expect(page.locator('.city-management .trade-form')).toBeVisible();
  await expect(page.locator('.management-tabs')).toHaveCount(0);
});

test('Ciudad Fortuna: la subasta abierta ofrece la puja a todos y muestra al líder', async ({
  page,
}) => {
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (typeof message === 'string' && message.startsWith('42')) {
        try {
          const packet = JSON.parse(message.slice(2));
          if (packet[0] === 'game:started' && packet[1].gameType === 'monopoly') {
            const state = packet[1].publicState;
            const bot = state.players.find(
              (player: { isBot: boolean; id: string }) => player.isBot,
            );
            state.auction = {
              tileIndex: 1,
              currentBid: 30,
              highestBidderId: bot.id,
              passedPlayerIds: [],
            };
            route.send(`42${JSON.stringify(packet)}`);
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
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.phase-label')).toContainText('Subasta abierta');
  await expect(page.locator('.auction-form')).toBeVisible();
  await expect(page.locator('#auction-bid')).toHaveAttribute('min', '40');
  await expect(page.getByRole('button', { name: 'Pasar', exact: true })).toBeVisible();
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
  const accessibility = await accessibilityAudit(page).analyze();
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
  await context.setOffline(true);
  await expect(page.locator('.game-message')).toContainText('Reconectando', { timeout: 25000 });
  await context.setOffline(false);
  await expect(page.locator('.game-message')).toHaveCount(0, { timeout: 15000 });
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
  await expect(page.locator('.players-panel .table-player')).toHaveCount(6);
  await expect(page.locator('.city-token .player-piece')).toHaveCount(6);
  await page.getByRole('button', { name: 'Tirar dados', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Tirar dados', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await page.getByRole('button', { name: 'Propiedades', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Propiedades', exact: true })).toBeInViewport({
    ratio: 0.99,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: 'tests/.output/screenshots/city-six-players.png', fullPage: true });
});

test('Ciudad Fortuna: seis fichas no invaden nombres ni precios en ninguna orientación', async ({
  page,
}) => {
  let playerIds: string[] = [];
  let update: (positions: number[]) => void = () => {
    throw new Error('Missing game state');
  };
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (typeof message === 'string' && message.startsWith('42')) {
        const packet = JSON.parse(message.slice(2));
        if (packet[0] === 'game:started') {
          const state = packet[1].publicState;
          playerIds = state.players.map((player: { id: string }) => player.id);
          update = (positions) => {
            state.players.forEach((player: { position: number }, index: number) => {
              player.position = positions[index];
            });
            route.send(`42${JSON.stringify(['game:state_update', state])}`);
          };
        }
      }
      route.send(message);
    });
  });
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  for (let count = 3; count <= 6; count++) {
    await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
    await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(count);
  }
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.city-token')).toHaveCount(6);
  for (const width of [1366, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    update([1, 2, 3, 4, 5, 6]);
    await expect(page.locator('.city-token[data-position="1"]')).toHaveCount(1);
    const solo = await page.evaluate((playerId) => {
      const tile = document.querySelectorAll('.city-tile')[1];
      const lane = tile.querySelector('.tile-lane')!.getBoundingClientRect();
      const token = document
        .querySelector(`.city-token[data-player="${playerId}"]`)!
        .getBoundingClientRect();
      return {
        x: token.left + token.width / 2,
        y: token.top + token.height / 2,
        laneX: lane.left + lane.width / 2,
        laneY: lane.top + lane.height / 2,
      };
    }, playerIds[0]);
    expect(Math.abs(solo.x - solo.laneX)).toBeLessThan(1.5);
    expect(Math.abs(solo.y - solo.laneY)).toBeLessThan(1.5);

    update([1, 1, 3, 4, 5, 6]);
    await expect(page.locator('.city-token[data-position="1"]')).toHaveCount(2);
    const pair = await page.evaluate(
      (ids) => {
        const tile = document.querySelectorAll('.city-tile')[1];
        const lane = tile.querySelector('.tile-lane')!.getBoundingClientRect();
        const tokens = ids.map((id) =>
          document.querySelector(`.city-token[data-player="${id}"]`)!.getBoundingClientRect(),
        );
        const centers = tokens.map((token) => ({
          x: token.left + token.width / 2,
          y: token.top + token.height / 2,
        }));
        return {
          centers,
          laneX: lane.left + lane.width / 2,
        };
      },
      playerIds.slice(0, 2),
    );
    expect(pair.centers[0].x).toBeLessThan(pair.centers[1].x);
    expect(Math.abs(pair.centers[0].y - pair.centers[1].y)).toBeLessThan(1.5);
    expect(Math.abs((pair.centers[0].x + pair.centers[1].x) / 2 - pair.laneX)).toBeLessThan(1.5);

    for (const position of [0, 1, 5, 10, 12, 15, 20, 23, 28, 30, 35, 39]) {
      update(Array(6).fill(position));
      await expect(page.locator(`.city-token[data-position="${position}"]`)).toHaveCount(6);
      const issues = await page.evaluate((position) => {
        const tile = document.querySelectorAll('.city-tile')[position];
        const tokens = [...document.querySelectorAll('.city-token')].map((el) =>
          el.getBoundingClientRect(),
        );
        const labels = [...tile.querySelectorAll('.tile-name, .tile-price')].map((el) =>
          el.getBoundingClientRect(),
        );
        const overlaps = (a: DOMRect, b: DOMRect) =>
          a.left < b.right - 1 &&
          a.right > b.left + 1 &&
          a.top < b.bottom - 1 &&
          a.bottom > b.top + 1;
        return {
          labels: labels.some((label) => tokens.some((token) => overlaps(label, token))),
          tokens: tokens.some((token, i) =>
            tokens.slice(i + 1).some((other) => overlaps(token, other)),
          ),
          fontSize: parseFloat(getComputedStyle(tile.querySelector('.tile-name')!).fontSize),
          clipped: [...tile.querySelectorAll('.tile-name')].some(
            (el) => el.scrollWidth > el.clientWidth + 1,
          ),
        };
      }, position);
      expect(issues, `width ${width}, tile ${position}`).toMatchObject({
        labels: false,
        tokens: false,
        clipped: false,
      });
      if (width >= 901) expect(issues.fontSize).toBeGreaterThanOrEqual(10);
      else {
        await page.locator('.city-tile').nth(position).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        const title = page.getByRole('dialog').getByRole('heading').first();
        expect(
          await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        ).toBeGreaterThanOrEqual(16);
        await page.keyboard.press('Escape');
      }
    }
  }
});

test('Ciudad Fortuna: anima pasos reales, respeta movimiento reducido y no repite al recargar', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let send: (id: number) => void = () => {
    throw new Error('Missing game state');
  };
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (typeof message === 'string' && message.startsWith('42')) {
        const packet = JSON.parse(message.slice(2));
        if (packet[0] === 'game:started') {
          const state = packet[1].publicState;
          send = (id) => {
            state.players[0].position = 5;
            state.lastMovement = {
              id,
              playerId: state.players[0].id,
              from: 0,
              dice: [2, 3],
              path: [1, 2, 3, 4, 5].map((position) => ({ position, direct: false })),
            };
            route.send(`42${JSON.stringify(['game:state_update', state])}`);
          };
        }
      }
      route.send(message);
    });
  });
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.city-token')).toHaveCount(2);
  send(1);
  await expect(page.locator('.dice-rolling')).toBeVisible();
  await expect(page.locator('.city-token').first()).toHaveAttribute('data-position', /[1-4]/);
  await expect(page.locator('.city-token').first()).toHaveAttribute('data-position', '5');
  await expect(page.locator('.tokens-moving')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  send(2);
  await expect(page.locator('.city-token').first()).toHaveAttribute('data-position', '5');
  await expect(page.locator('.tokens-moving, .dice-rolling')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.city-token')).toHaveCount(2);
  await expect(page.locator('.tokens-moving, .dice-rolling')).toHaveCount(0);
});

test('Ciudad Fortuna: tablero móvil completo, inspección legible y gestión accesible sin zoom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.city-tile')).toHaveCount(40);
  await expect(page.locator('.board-zoomed')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ampliar tablero', exact: true })).toHaveCount(0);
  await page.locator('.city-tile').nth(1).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Alquileres');
  expect(
    await dialog
      .locator('.rent-row')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(13);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Propiedades', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Propiedades', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
