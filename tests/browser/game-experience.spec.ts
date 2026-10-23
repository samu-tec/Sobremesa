import { test, expect, type Page } from '@playwright/test';
import { accessibilityAudit } from './accessibility';

async function ready(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', 'Ana');
  });
  await page.goto('/');
  await expect(page.locator('.connection')).toBeVisible();
  await expect(page.locator('.connection')).toHaveAttribute('aria-label', 'Listo para jugar');
}
async function start(page: Page, game = 'tictactoe') {
  await ready(page);
  await page.locator(`.game-${game} .play-bot`).click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.play-header')).toBeVisible();
}

const gameCenterTargets = {
  tictactoe: { surface: '.ttt-board', region: '.play-area' },
  chess: { surface: '.chess-board', region: '.extended-play' },
  reversi: { surface: '.reversi-board', region: '.play-area' },
  pig: { surface: '.pig-dice .dice-face', region: '.extended-play' },
  colorclash: { surface: '.color-table', region: '.table-layout' },
  monopoly: { surface: '.city-main', region: '.extended-play' },
} as const;

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 360, height: 640 },
])
  test(`Cabecera, avisos y reconexión conservan la mesa entre turnos reales (${viewport.width}px)`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize(viewport);
    await ready(page);
    await page.locator('.game-tictactoe .play-friends').click();
    const code = (await page.locator('.room-code-text').innerText()).trim();
    const context = await browser.newContext();
    try {
      const guest = await context.newPage();
      await ready(guest);
      await guest.goto(`/?room=${code}`);
      await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
      await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
      await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
      const board = page.locator('.ttt-board');
      await expect(board).toBeVisible();
      await expect(page.getByRole('button', { name: /autoplay/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Reglas' })).toBeVisible();
      const top = (await board.boundingBox())!.y;
      await expect(page.locator('.game-message-slot')).toHaveCount(0);
      await expect(page.locator('.table-player.active')).toContainText('Es tu turno');
      expect((await board.boundingBox())!.y).toBe(top);
      await board.locator('button').nth(0).click();
      await expect(guest.locator('.table-player.active')).toContainText('Es tu turno');
      expect((await board.boundingBox())!.y).toBe(top);
      await guest.locator('.ttt-board button').nth(4).click();
      await expect(page.locator('.table-player.active')).toContainText('Es tu turno');
      expect((await board.boundingBox())!.y).toBe(top);
      await guest.close();
      await expect(page.locator('.game-message')).toContainText('reconectando');
      expect((await board.boundingBox())!.y).toBe(top);
      await page.locator('.game-message-detail').focus();
      const afterFocus = (await board.boundingBox())!.y;
      await page.locator('.game-message-detail').press('Enter');
      await expect(page.getByRole('dialog')).toContainText(
        'Ana está reconectando. El anfitrión podrá gestionar su ausencia en 3 minutos.',
      );
      await page.keyboard.press('Escape');
      await expect(page.locator('.game-message-detail')).toBeFocused();
      expect((await board.boundingBox())!.y).toBe(afterFocus);
    } finally {
      await context.close();
    }
  });

for (const game of ['tictactoe', 'chess', 'reversi', 'pig', 'colorclash', 'monopoly'])
  test(`${game}: distribución, controles y modo inmersivo en tamaños pequeños y grandes`, async ({
    page,
  }) => {
    // Exercise the fallback used by mobile browsers and denied fullscreen requests.
    await page.addInitScript(() => {
      Element.prototype.requestFullscreen = () => Promise.reject(new Error('Fullscreen denied'));
    });
    await start(page, game);
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 320, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        JSON.stringify(viewport),
      ).toBe(true);
      const { surface, region } = gameCenterTargets[game as keyof typeof gameCenterTargets];
      const surfaceBox = await page.locator(surface).boundingBox();
      const regionBox = await page.locator(region).boundingBox();
      expect(surfaceBox, `${game} ${surface} en ${viewport.width}px`).not.toBeNull();
      expect(regionBox, `${game} ${region} en ${viewport.width}px`).not.toBeNull();
      expect(
        Math.abs(surfaceBox!.x + surfaceBox!.width / 2 - (regionBox!.x + regionBox!.width / 2)),
        `${game} debe centrar ${surface} en ${viewport.width}px`,
      ).toBeLessThanOrEqual(2);
      if (viewport.width > 900) {
        const vertical = await page.locator(region).evaluate((element) => {
          const main = document.querySelector<HTMLElement>('.game-content')!;
          const rect = main.getBoundingClientRect();
          const styles = getComputedStyle(main);
          const paddingTop = Number.parseFloat(styles.paddingTop);
          const paddingBottom = Number.parseFloat(styles.paddingBottom);
          const contentHeight = main.clientHeight - paddingTop - paddingBottom;
          const regionRect = element.getBoundingClientRect();
          return {
            fits: regionRect.height <= contentHeight + 1,
            regionCenter: regionRect.top + regionRect.height / 2,
            contentCenter: rect.top + paddingTop + contentHeight / 2,
          };
        });
        if (vertical.fits)
          expect(
            Math.abs(vertical.regionCenter - vertical.contentCenter),
            `${game} debe centrar verticalmente la zona de juego en ${viewport.height}px`,
          ).toBeLessThanOrEqual(3);
      }
      for (const label of viewport.width <= 900
        ? ['Reglas', 'Preferencias']
        : ['Reglas', 'Ampliar el juego', 'Preferencias']) {
        const control = page.getByRole('button', { name: label, exact: true });
        await expect(control).toBeVisible();
        const box = (await control.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('button', { name: 'Ampliar el juego', exact: true }).click();
    await expect(page.locator('.game-page')).toHaveClass(/game-immersive/);
    await expect(page.locator('.play-header')).toHaveCSS('position', 'sticky');
    await expect(page.locator('.play-brand > span')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Salir de pantalla completa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Reglas', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.game-page')).toHaveClass(/game-immersive/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.game-page')).not.toHaveClass(/game-immersive/);
    await page.getByRole('button', { name: 'Ampliar el juego', exact: true }).click();
    await page.getByRole('button', { name: 'Salir de pantalla completa', exact: true }).click();
    await expect(page.locator('.game-page')).not.toHaveClass(/game-immersive/);
    await page.setViewportSize({ width: 390, height: 844 });
    const audit = await accessibilityAudit(page).analyze();
    expect(
      audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await page.screenshot({
      path: `tests/.output/screenshots/experience-${game}-mobile.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({
      path: `tests/.output/screenshots/experience-${game}-desktop.png`,
      fullPage: true,
    });
  });

test('Pantalla completa conserva diálogos y se recupera al salir, con alternativa CSS cuando el navegador la rechaza', async ({
  page,
  browserName,
}) => {
  await start(page);
  await page.getByRole('button', { name: 'Ampliar el juego', exact: true }).click();
  await expect(page.locator('.game-page')).toHaveClass(/game-immersive/);
  await expect(
    page.getByRole('button', { name: 'Salir de pantalla completa', exact: true }),
  ).toBeEnabled();
  // Chromium de escritorio debe entrar en fullscreen nativo. WebKit headless puede rechazarlo.
  if (browserName === 'chromium')
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement === document.documentElement))
      .toBe(true);
  const native = await page.evaluate(() => document.fullscreenElement === document.documentElement);
  await page.getByRole('button', { name: 'Reglas', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar diálogo', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  if (native && browserName === 'webkit') {
    // WebKit consumes native fullscreen Escape before delivering any DOM key event.
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    await expect(page.locator('.game-page')).not.toHaveClass(/game-immersive/);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar diálogo', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reglas', exact: true })).toBeFocused();
  } else {
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reglas', exact: true })).toBeFocused();
    await expect(page.locator('.game-page')).toHaveClass(/game-immersive/);
    if (native) await page.evaluate(() => document.exitFullscreen());
    else await page.keyboard.press('Escape');
    await expect(page.locator('.game-page')).not.toHaveClass(/game-immersive/);
  }
});

test('Sonido y volumen persisten, el bloqueo de audio no impide jugar', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', {
      value: class {
        constructor() {
          throw new Error('Audio blocked');
        }
      },
    });
  });
  await start(page);
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  const soundToggle = page.getByRole('switch', { name: 'Sonido', exact: true });
  await expect(soundToggle).toBeChecked();
  await expect(page.getByRole('slider', { name: 'Volumen' })).toHaveValue('25');
  await soundToggle.uncheck();
  await page.getByRole('slider', { name: 'Volumen' }).fill('40');
  await page.keyboard.press('Escape');
  await page.locator('.ttt-board button').first().click();
  await expect(page.locator('.ttt-board .cell-x')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  const persistedSoundToggle = page.getByRole('switch', { name: 'Sonido', exact: true });
  await expect(persistedSoundToggle).not.toBeChecked();
  await expect(page.getByRole('slider', { name: 'Volumen' })).toHaveValue('40');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  await page.getByRole('switch', { name: 'Sonido', exact: true }).check();
  await page.getByRole('switch', { name: 'Sonido', exact: true }).uncheck();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sobremesa.sound')!))).toEqual({
    enabled: false,
    volume: 0.4,
  });
});

test('El audio sintetiza una señal real y no se reproduce al recargar la partida', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    const observed = window as unknown as { audioContexts: AudioContext[]; peak: number };
    observed.audioContexts = [];
    observed.peak = 0;
    window.AudioContext = class extends NativeAudio {
      analyser: AnalyserNode;
      constructor() {
        super();
        observed.audioContexts.push(this);
        this.analyser = this.createAnalyser();
        this.analyser.fftSize = 256;
        const samples = new Float32Array(256);
        const measure = () => {
          if (this.state === 'closed') return;
          this.analyser.getFloatTimeDomainData(samples);
          observed.peak = Math.max(observed.peak, ...samples.map(Math.abs));
          requestAnimationFrame(measure);
        };
        requestAnimationFrame(measure);
      }
      createGain() {
        const gain = super.createGain();
        gain.connect(this.analyser);
        return gain;
      }
    };
  });
  await start(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { audioContexts: AudioContext[] }).audioContexts[0]?.currentTime,
      ),
    )
    .toBeGreaterThan(1.2);
  await page.locator('.ttt-board button').first().click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { peak: number }).peak))
    .toBeGreaterThan(0.0001);
  await page.reload();
  await expect(page.locator('.play-header')).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { audioContexts: AudioContext[] }).audioContexts.length,
    ),
  ).toBe(0);
});

test('Dominó: terminar y consultar una ronda mantiene la mesa y permite continuar', async ({
  page,
  browser,
}) => {
  await ready(page);
  await page.locator('.game-dominoes .play-friends').click();
  const code = (await page.locator('.room-code-text').innerText()).trim();
  const context = await browser.newContext();
  try {
    const guest = await context.newPage();
    await ready(guest);
    await guest.goto(`/?room=${code}`);
    await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
    await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await expect(page.locator('.domino-table')).toBeVisible();
    for (let move = 0; move < 100 && !(await page.getByRole('dialog').count()); move++) {
      await expect
        .poll(
          async () =>
            (await page
              .locator('.domino-hand button:enabled,.board-actions button:enabled')
              .count()) +
            (await guest
              .locator('.domino-hand button:enabled,.board-actions button:enabled')
              .count()) +
            (await page.getByRole('dialog').count()),
        )
        .toBeGreaterThan(0);
      if (await page.getByRole('dialog').count()) break;
      const actor = (await page
        .locator('.domino-hand button:enabled,.board-actions button:enabled')
        .count())
        ? page
        : guest;
      const tiles = actor.locator('.domino-hand button:enabled');
      if (await tiles.count()) {
        await tiles.first().click();
        await actor
          .locator('.board-actions button:enabled')
          .filter({ hasText: 'Colocar' })
          .first()
          .click();
      } else {
        await actor.locator('.board-actions button:enabled').first().click();
      }
    }
    await expect(page.getByRole('dialog')).toContainText('Ronda 1 terminada');
    const top = (await page.locator('.domino-table').boundingBox())!.y;
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(Math.abs((await page.locator('.domino-table').boundingBox())!.y - top)).toBeLessThan(1);
    await page.getByRole('button', { name: 'Ronda 1 terminada', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(Math.abs((await page.locator('.domino-table').boundingBox())!.y - top)).toBeLessThan(1);
    const next = page.getByRole('button', { name: 'Siguiente ronda', exact: true });
    if (await next.isEnabled()) await next.click();
    else await guest.getByRole('button', { name: 'Siguiente ronda', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.board-topline')).toContainText('Ronda 2 de');
  } finally {
    await context.close();
  }
});

for (const game of ['tictactoe', 'backgammon', 'words', 'poker', 'monopoly'])
  test(`Zonas compartidas: ${game}, título centrado y fila activa`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await start(page, game);
    const title = page.locator('.play-title h1');
    const box = (await title.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
    await expect(page.locator('.play-brand')).toBeVisible();
    await expect(page.locator('.game-message-slot,.game-tip,.turn-announcement')).toHaveCount(0);
    const active = page.locator('.table-player.active');
    await expect(active).toContainText('Es tu turno');
    expect(await active.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
    if (game !== 'tictactoe') {
      const actions = (await page.locator('.game-actions-panel').boundingBox())!;
      const surface = (await page.locator('.extended-play').boundingBox())!;
      const players = (await page.locator('.players-panel').boundingBox())!;
      expect(actions.x + actions.width).toBeLessThanOrEqual(surface.x);
      expect(surface.x + surface.width).toBeLessThanOrEqual(players.x);
      await expect(page.locator('.game-actions-panel .turn-clock')).toHaveCount(1);
    } else await expect(page.locator('.game-actions-panel')).toHaveCount(0);
    for (const width of [768, 390, 360]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      const rect = (await title.boundingBox())!;
      expect(Math.abs(rect.x + rect.width / 2 - width / 2)).toBeLessThanOrEqual(1);
    }
    expect((await accessibilityAudit(page).analyze()).violations).toEqual([]);
  });

test('Autoplay solo aparece tras inactividad y no se puede activar desde la interfaz', async ({
  page,
}) => {
  await ready(page);
  await page.locator('.game-tictactoe .play-bot').click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.ttt-board')).toBeVisible();
  await expect(page.getByRole('button', { name: /autoplay/i })).toHaveCount(0);
  await expect(page.locator('.autoplay-countdown')).toHaveCount(0);
  await expect(page.locator('.ttt-board .cell-x')).toHaveCount(0);
});

test('Sala de Ciudad Fortuna: duración junto al contador y reglas solo en la barra de partida', async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Ciudad Fortuna contra un bot', exact: true })
    .click();
  await expect(page.locator('.waiting-players .waiting-duration')).toContainText('30–90 min');
  await expect(page.locator('.waiting-game')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ver las reglas', exact: true })).toHaveCount(0);
  await expect(page.locator('.room-settings-heading .turn-setting')).toBeVisible();
  await expect(page.locator('.city-settings-grid > *')).toHaveCount(12);
  const passGoBonus = page.getByRole('switch', {
    name: 'Cobrar el doble al pasar por Salida',
    exact: true,
  });
  const snakeEyesBonus = page.getByRole('switch', {
    name: 'Recibir 500 € al sacar dobles de uno',
    exact: true,
  });
  await expect(passGoBonus).not.toBeChecked();
  await expect(snakeEyesBonus).not.toBeChecked();
  await passGoBonus.click();
  await expect(passGoBonus).toBeChecked();
  await snakeEyesBonus.click();
  await expect(snakeEyesBonus).toBeChecked();

  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.game-header.play-header')).toBeVisible();
  await expect(
    page.locator('.play-header').getByRole('button', { name: 'Reglas', exact: true }),
  ).toBeVisible();
});
