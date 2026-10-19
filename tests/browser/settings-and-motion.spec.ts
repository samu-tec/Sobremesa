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
async function room(page: Page, id: string) {
  await page.locator(`.game-${id} .play-bot`).click();
  await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeVisible();
}
async function select(page: Page, label: string, value: string) {
  await page.getByRole('combobox', { name: label, exact: true }).selectOption(value);
}
async function start(page: Page) {
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.getByText('Es tu turno', { exact: true })).toBeVisible();
}
for (const id of [
  'rummy',
  'dominoes',
  'impostor',
  'mancala',
  'pig',
  'combinations',
  'battleship',
  'checkers',
  'chess',
])
  test(`${id}: opciones aplicadas, reglas y recarga en móvil`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await ready(page);
    await room(page, id);
    if (id === 'rummy') {
      await select(page, 'Puntos para abrir', '50');
      await select(page, 'Fichas iniciales', '10');
      await page.getByRole('switch', { name: 'Jugar con comodines', exact: true }).uncheck();
    }
    if (id === 'dominoes') {
      await select(page, 'Puntuación objetivo', '150');
      await select(page, 'Máximo de rondas', '1');
      await select(page, 'Fichas iniciales', '5');
    }
    if (id === 'impostor') {
      await select(page, 'Vueltas de pistas', '1');
      await select(page, 'Tema de las palabras', '2');
      await page.getByRole('switch', { name: 'Mostrar la categoría', exact: true }).uncheck();
    }
    if (id === 'mancala') await select(page, 'Semillas por hoyo', '6');
    if (id === 'pig') await select(page, 'Puntos para ganar', '50');
    if (id === 'combinations') {
      await select(page, 'Tiradas por turno', '1');
      await page
        .getByRole('switch', { name: 'Bonificación de la sección superior', exact: true })
        .uncheck();
    }
    if (id === 'battleship')
      await page.getByRole('switch', { name: 'Repetir turno al acertar', exact: true }).check();
    if (id === 'checkers') await select(page, 'Límite de jugadas sin progreso', '40');
    if (id === 'chess')
      await page.getByRole('switch', { name: 'Tablas automáticas', exact: true }).uncheck();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeVisible();
    const a11y = await accessibilityAudit(page).analyze();
    expect(a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
      [],
    );
    await start(page);
    if (id === 'rummy') {
      await expect(page.locator('.number-tile-rack > button')).toHaveCount(10);
      await expect(page.getByText('104 FICHAS · 0 COMODINES', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Para abrir necesitas 50 puntos.', { exact: true }),
      ).toBeVisible();
    }
    if (id === 'dominoes') {
      await expect(page.getByText('Ronda 1 de 1', { exact: true })).toBeVisible();
      await expect(page.locator('.domino-hand > button')).toHaveCount(5);
    }
    if (id === 'impostor') {
      await expect(page.getByText('Sin pista de categoría', { exact: true })).toBeVisible();
      await page.getByRole('textbox', { name: 'Tu pista', exact: true }).fill('misterio');
      await page.getByRole('button', { name: 'Enviar pista', exact: true }).click();
      await expect(page.getByRole('button', { name: /Votar a Bot/ }).first()).toBeVisible();
    }
    if (id === 'mancala')
      expect(await page.locator('.seed-pit strong,.seed-store strong').allTextContents()).toEqual([
        '0',
        '6',
        '6',
        '6',
        '6',
        '6',
        '6',
        '6',
        '6',
        '6',
        '6',
        '6',
        '6',
        '0',
      ]);
    if (id === 'pig')
      await expect(page.locator('.score-tracks progress').first()).toHaveAttribute('max', '50');
    if (id === 'combinations') {
      await page.getByRole('button', { name: 'Tirar dados', exact: true }).click();
      await expect(page.getByText('Tirada 1 de 1', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Volver a tirar', exact: true }),
      ).toBeDisabled();
    }
    await page.getByRole('button', { name: 'Reglas', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Opciones de esta partida');
    if (id === 'battleship')
      await expect(page.getByRole('dialog')).toContainText('Repetir turno al acertar: Sí');
    if (id === 'checkers') await expect(page.getByRole('dialog')).toContainText('40 jugadas');
    if (id === 'chess')
      await expect(page.getByRole('dialog')).toContainText('Tablas automáticas: No');
    await page.keyboard.press('Escape');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  });

test('La sala permite restablecer las opciones antes de empezar', async ({ page }) => {
  await ready(page);
  await room(page, 'rummy');
  await select(page, 'Puntos para abrir', '50');
  await select(page, 'Fichas iniciales', '10');
  await page.getByRole('button', { name: 'Restablecer opciones', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Puntos para abrir', exact: true })).toHaveValue(
    '30',
  );
  await expect(page.getByRole('combobox', { name: 'Fichas iniciales', exact: true })).toHaveValue(
    '14',
  );
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Puntos para abrir', exact: true })).toHaveValue(
    '30',
  );
});

async function captureMotion(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.motionLog = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes: any, options: any) {
      w.motionLog.push({
        className: this.getAttribute('class') || '',
        kept: this.getAttribute('data-kept'),
        frames: keyframes,
      });
      return original.call(this, keyframes, options);
    };
  });
}
for (const width of [1366, 320])
  test(`Ajedrez: movimiento real y reducción de animaciones a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await captureMotion(page);
    await ready(page);
    await room(page, 'chess');
    await start(page);
    await page.getByRole('button', { name: 'e2: Blancas Peón', exact: true }).click();
    await page.getByRole('button', { name: 'e4: vacía, jugada válida', exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as any).motionLog.some(
            (v: any) =>
              v.className.includes('chess-piece') &&
              v.frames.some((f: any) => String(f.transform).includes('translate(')),
          ),
        ),
      )
      .toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect
      .poll(() =>
        page
          .locator('.chess-piece')
          .evaluateAll((nodes) => nodes.flatMap((node) => node.getAnimations()).length),
      )
      .toBe(0);
    await expect(page.getByRole('button', { name: 'e4: Blancas Peón', exact: true })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  });
test('Rummy: las fichas se mueven entre el atril y la mesa sin bloquear el editor', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await captureMotion(page);
  await ready(page);
  await room(page, 'rummy');
  await start(page);
  await page.locator('.number-tile-rack > button').first().click();
  await page.getByRole('button', { name: /Crear combinación/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).motionLog.some((v: any) => v.className.includes('number-tile')),
      ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.number-tile-rack > button')).toHaveCount(14);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const before = await page.evaluate(() => (window as any).motionLog.length);
  await page.locator('.number-tile-rack > button').first().click();
  await page.getByRole('button', { name: /Crear combinación/ }).click();
  expect(await page.evaluate(() => (window as any).motionLog.length)).toBe(before);
  await expect(page.getByRole('button', { name: 'Confirmar jugada', exact: true })).toBeDisabled();
});
test('Dados: los dados guardados no se animan ni cambian al volver a tirar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await captureMotion(page);
  await ready(page);
  await room(page, 'combinations');
  await start(page);
  await page.getByRole('button', { name: 'Tirar dados', exact: true }).click();
  await page.locator('.combination-dice > button').first().click();
  const held = await page
    .locator('.combination-dice .dice-face')
    .first()
    .getAttribute('aria-label');
  await page.evaluate(() => ((window as any).motionLog = []));
  await page.getByRole('button', { name: 'Volver a tirar', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).motionLog.filter((v: any) => v.className.includes('dice-face')).length,
      ),
    )
    .toBe(4);
  expect(
    await page.locator('.combination-dice .dice-face').first().getAttribute('aria-label'),
  ).toBe(held);
  expect(
    await page.evaluate(
      () =>
        (window as any).motionLog.filter(
          (v: any) => v.className.includes('dice-face') && v.kept === 'true',
        ).length,
    ),
  ).toBe(0);
});
test('Mancala: animación de siembra con limpieza de las semillas decorativas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await captureMotion(page);
  await ready(page);
  await room(page, 'mancala');
  await start(page);
  await page.locator('.mancala-row').nth(1).getByRole('button').nth(2).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).motionLog.some((v: any) => v.className === 'sowing-seed'),
      ),
    )
    .toBe(true);
  await expect(page.locator('.sowing-seed')).toHaveCount(0);
  const sum = await page.locator('.seed-pit strong,.seed-store strong').allTextContents();
  expect(sum.reduce((n, v) => n + Number(v), 0)).toBe(48);
});
