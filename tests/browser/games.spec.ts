import { getGame } from 'sobremesa-logic';
import { test, expect, type Page } from '@playwright/test';
import { accessibilityAudit } from './accessibility';
type ParchisMotionWindow = Window & { parchisMotion: Keyframe[][] };

const games = [
  ['mus', 'Mus', 'Mus'],
  ['escoba', 'Escoba del 15', 'Escoba of 15'],
  ['cinquillo', 'Cinquillo', 'Cinquillo'],
  ['poker', 'Texas Hold’em', 'Texas Hold’em'],
  ['words', 'Palabras cruzadas', 'Crosswords'],
  ['quiz', 'Preguntas y respuestas', 'Questions and answers'],
  ['mystery', 'Misterio y deducción', 'Mystery and deduction'],
  ['conquest', 'Conquista de territorios', 'Territory conquest'],
  ['brisca', 'Brisca', 'Brisca'],
  ['mahjong', 'Mahjong tradicional', 'Traditional Mahjong'],
  ['chinesecheckers', 'Damas chinas', 'Chinese Checkers'],
  ['go', 'Go', 'Go'],
  ['oca', 'Juego de la Oca', 'Game of the Goose'],
  ['parchis', 'Parchís', 'Parchís'],
  ['rummy', 'Rummy', 'Rummy'],
  ['chess', 'Ajedrez', 'Chess'],
  ['impostor', 'Impostor', 'Impostor'],
  ['dominoes', 'Dominó', 'Dominoes'],
  ['checkers', 'Damas', 'Checkers'],
  ['backgammon', 'Backgammon', 'Backgammon'],
  ['battleship', 'Batalla naval', 'Naval Battle'],
  ['mancala', 'Mancala', 'Mancala'],
  ['combinations', 'Dados de combinaciones', 'Dice Combinations'],
] as const;
async function ready(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('sobremesa.locale')) localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', localStorage.getItem('sobremesa.name') || 'Ana');
  });
  await page.goto('/');
  await expect(page.locator('.connection')).toBeVisible();
  await expect(page.locator('.connection')).toHaveAttribute('aria-label', 'Listo para jugar');
}

async function expectActionButtonsToMatchWidths(page: Page) {
  const groups = await page.locator('.game-actions-panel button').evaluateAll((buttons) => {
    const byParent = new Map<Element, number[]>();
    for (const button of buttons) {
      if (!button.getClientRects().length) continue;
      const parent = button.parentElement!;
      byParent.set(parent, [...(byParent.get(parent) ?? []), button.getBoundingClientRect().width]);
    }
    return [...byParent.values()];
  });
  for (const widths of groups) expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
}

const centeredBoards: Record<string, string> = {
  mus: '.mus-own',
  escoba: '.escoba-table',
  cinquillo: '.cinquillo-table',
  poker: '.poker-table',
  words: '.words-grid',
  quiz: '.quiz-question',
  mystery: '.mystery-private',
  conquest: '.conquest-map svg',
  brisca: '.brisca-table',
  mahjong: '.mahjong-table',
  chinesecheckers: '.chinese-board:not(.enlarged)',
  chess: '.chess-board',
  checkers: '.checkers-board',
  go: '.go-board',
  oca: '.oca-board',
  parchis: '.parchis-board',
  rummy: '.number-tile-table',
  impostor: '.impostor-secret',
  dominoes: '.domino-table',
  backgammon: '.backgammon-board',
  battleship: '.fleet-boards',
  mancala: '.mancala-board',
  combinations: '.scorecard-wrap',
};

async function expectGameAreaCentered(page: Page) {
  const box = await page.locator('.extended-play').boundingBox();
  expect(box).not.toBeNull();
  const geometry = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.game-content')!;
    const rect = main.getBoundingClientRect();
    const styles = getComputedStyle(main);
    const paddingTop = Number.parseFloat(styles.paddingTop);
    const paddingBottom = Number.parseFloat(styles.paddingBottom);
    const contentHeight = main.clientHeight - paddingTop - paddingBottom;
    const area = document.querySelector<HTMLElement>('.extended-play')!.getBoundingClientRect();
    return {
      viewportCenterX: innerWidth / 2,
      areaCenterX: area.left + area.width / 2,
      areaCenterY: area.top + area.height / 2,
      mainCenterY: rect.top + paddingTop + contentHeight / 2,
      areaHeight: area.height,
      contentHeight,
      viewportWidth: innerWidth,
    };
  });
  expect(Math.abs(box!.x + box!.width / 2 - geometry.viewportCenterX)).toBeLessThanOrEqual(2);
  if (geometry.viewportWidth > 900 && geometry.areaHeight <= geometry.contentHeight + 1)
    expect(Math.abs(geometry.areaCenterY - geometry.mainCenterY)).toBeLessThanOrEqual(3);
}

async function expectCenteredBoard(page: Page, gameId: string) {
  const selector = centeredBoards[gameId];
  if (!selector) return;
  const board = page.locator(selector).first();
  await expect(board).toBeVisible();
  const geometry = await board.evaluate((element) => {
    const panel = element.closest('.extended-play')!;
    const boardRect = element.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
      boardCenter: boardRect.left + boardRect.width / 2,
      panelCenter: panelRect.left + panelRect.width / 2,
      boardWidth: boardRect.width,
      scrollParentWidth: element.parentElement?.clientWidth ?? 0,
    };
  });
  // Oversized boards intentionally scroll on narrow screens; when the whole surface fits,
  // its visible center must match the centered game column.
  if (geometry.boardWidth <= geometry.scrollParentWidth + 1)
    expect(Math.abs(geometry.boardCenter - geometry.panelCenter)).toBeLessThanOrEqual(2);
}

for (const width of [1280, 1024, 360])
  test(`Cuatro en Línea centra la zona de juego a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    await page
      .getByRole('button', { name: 'Jugar a Cuatro en Línea contra un bot', exact: true })
      .click();
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    const board = page.locator('.connect-board');
    await expect(board).toBeVisible();
    const center = await board.evaluate((element) => {
      const { x, width } = element.getBoundingClientRect();
      return x + width / 2;
    });
    expect(Math.abs(center - width / 2)).toBeLessThanOrEqual(2);
  });
for (const width of [1280, 1100, 1024, 901])
  test(`Ajedrez centra el tablero con panel de acciones a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await ready(page);
    await page.getByRole('button', { name: 'Jugar a Ajedrez contra un bot', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    const board = page.locator('.chess-board');
    await expect(board).toBeVisible();
    const actions = page.locator('.game-actions-panel');
    const players = page.locator('.table-sidebar');
    await expect(actions).toBeVisible();
    await expect(players).toBeVisible();
    const columns = await page.evaluate(() => {
      const actions = document.querySelector('.game-actions-panel')!.getBoundingClientRect();
      const board = document.querySelector('.chess-board')!.getBoundingClientRect();
      const players = document.querySelector('.table-sidebar')!.getBoundingClientRect();
      return {
        actionsRight: actions.right,
        actionsTop: actions.top,
        boardLeft: board.left,
        boardRight: board.right,
        playersLeft: players.left,
        playersTop: players.top,
      };
    });
    expect(columns.actionsRight).toBeLessThanOrEqual(columns.boardLeft + 1);
    expect(columns.boardRight).toBeLessThanOrEqual(columns.playersLeft + 1);
    expect(Math.abs(columns.actionsTop - columns.playersTop)).toBeLessThanOrEqual(1);
    const center = await board.evaluate((element) => {
      const { x, width } = element.getBoundingClientRect();
      return x + width / 2;
    });
    expect(Math.abs(center - width / 2)).toBeLessThanOrEqual(2);
  });

for (const width of [1280, 390])
  test(`Rummy alinea todos los botones del panel de acciones a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await ready(page);
    await page.getByRole('button', { name: 'Jugar a Rummy contra un bot', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();

    for (const selector of ['.tile-draft-tools', '.board-actions']) {
      const group = page.locator(`.game-actions-panel ${selector}`);
      const geometry = await group.evaluate((element) => {
        const buttons = [...element.querySelectorAll('button')].map(
          (button) => button.getBoundingClientRect().width,
        );
        return { groupWidth: element.getBoundingClientRect().width, buttons };
      });
      expect(geometry.buttons.length).toBeGreaterThan(1);
      expect(Math.max(...geometry.buttons) - Math.min(...geometry.buttons)).toBeLessThan(1);
      expect(Math.abs(geometry.groupWidth - geometry.buttons[0])).toBeLessThan(1);
    }
  });

for (const width of [1280, 320])
  for (const [id, name, english] of games)
    test(`${name}: jugar, reconectar e idioma a ${width}px`, async ({ page }) => {
      if (id === 'parchis') test.setTimeout(60000);
      if (id === 'impostor') test.setTimeout(60000);
      if (id === 'parchis' && width === 1280) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.addInitScript(() => {
          (window as ParchisMotionWindow).parchisMotion = [];
          const animate = Element.prototype.animate;
          Element.prototype.animate = function (frames, options) {
            if (this.hasAttribute('data-motion-id') && Array.isArray(frames))
              (window as ParchisMotionWindow).parchisMotion.push(frames);
            return animate.call(this, frames, options);
          };
        });
      }
      await page.setViewportSize({ width, height: 900 });
      await ready(page);
      await page
        .getByRole('button', { name: `Jugar a ${name} contra un bot`, exact: true })
        .click();
      await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(
        getGame(id).minPlayers,
      );
      await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
      await expect(page.locator(`.extended-${id}`)).toBeVisible();
      await expectGameAreaCentered(page);
      await expectCenteredBoard(page, id);
      await expect(page.locator('.table-player.active').filter({ hasText: '(tú)' })).toContainText(
        id === 'battleship' ? 'Preparando flota' : 'Es tu turno',
      );
      await expectActionButtonsToMatchWidths(page);
      const selectionSources: Record<string, string> = {
        brisca: '.spanish-hand > button:enabled',
        cinquillo: '.spanish-hand > button:enabled',
        escoba: '.spanish-hand > button:enabled',
        quiz: '.quiz-choices button:enabled',
        chess: '.chess-board [data-cell="e2"]',
        checkers: '.checkers-board button:enabled',
        dominoes: '.domino-hand button:enabled',
        mahjong: '.mahjong-hand button:enabled',
      };
      const source = selectionSources[id];
      if (
        source &&
        (!['dominoes', 'cinquillo'].includes(id) || (await page.locator(source).count()) > 0)
      ) {
        const button = page.locator(source).first();
        await button.click();
        await expect(
          page.getByRole('button', { name: 'Cancelar selección Esc', exact: true }),
        ).toBeEnabled();
        await button.press('Escape');
        await expect(
          page.getByRole('button', { name: 'Cancelar selección Esc', exact: true }),
        ).toBeDisabled();
        await expect(
          page.getByRole('button', { name: 'Empezar partida', exact: true }),
        ).toHaveCount(0);
      }
      if (id === 'mus') {
        await expect(page.locator('.spanish-hand > button')).toHaveCount(4);
        await page.getByRole('button', { name: 'Cortar el mus', exact: true }).click();
        await expect(
          page.getByRole('heading', { name: 'Lance: Grande', exact: true }),
        ).toBeVisible();
      }
      if (id === 'escoba') {
        await expect(page.locator('.spanish-hand > button')).toHaveCount(3);
        await page.locator('.spanish-hand > button').first().click();
        const capture = page.getByRole('combobox', { name: 'Captura rápida', exact: true });
        if (await capture.count()) await capture.selectOption('0');
        await page
          .getByRole('button', { name: /^(Capturar cartas|Dejar carta en la mesa)$/ })
          .click();
        await expect(page.locator('.spanish-hand > button')).toHaveCount(2);
        await page.getByRole('button', { name: 'Ver cartas ganadas', exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('Cartas ganadas');
      }
      if (id === 'cinquillo') {
        const playable = page.locator('.spanish-hand > button:enabled');
        if (await playable.count()) {
          const cards = await page.locator('.spanish-hand > button').count();
          await playable.first().click();
          await page.getByRole('button', { name: 'Colocar carta', exact: true }).focus();
          await page.keyboard.press('Enter');
          await expect(page.locator('.spanish-hand > button')).toHaveCount(cards - 1);
          await expect(page.locator('.cinquillo-slot .spanish-card').first()).toHaveCSS(
            'color',
            'rgb(36, 59, 50)',
          );
        } else {
          await page.getByRole('button', { name: 'Pasar', exact: true }).click();
          await expect(page.getByRole('status')).toHaveText(
            'Pasa sin cartas que se puedan colocar.',
          );
        }
      }
      if (id === 'poker') {
        await expect(page.locator('.poker-hand').first().locator('.poker-card')).toHaveCount(2);
        const call = page.getByRole('button', { name: /^Igualar / });
        const firstLabel = await call.innerText();
        await call.click();
        await expect(page.getByRole('button', { name: firstLabel, exact: true })).toHaveCount(0);
        await expect
          .poll(
            async () =>
              (await page.locator('.poker-community .poker-card').count()) === 3 ||
              ((await call.count()) > 0 && (await call.isEnabled())),
          )
          .toBe(true);
        if ((await page.locator('.poker-community .poker-card').count()) === 0) await call.click();
        await expect(page.locator('.poker-community .poker-card')).toHaveCount(3);
      }
      if (id === 'words') {
        await expect(page.locator('.words-rack > div')).toHaveCount(7);
        await page.locator('.words-rack input[type=checkbox]').first().check();
        await page.getByRole('button', { name: 'Cambiar letras marcadas', exact: true }).click();
        await expect(page.locator('.words-rack > div')).toHaveCount(7);
      }
      if (id === 'quiz') {
        await expect(page.locator('.quiz-choices button')).toHaveCount(4);
        await page.locator('.quiz-choices button').first().click();
        await page.getByRole('button', { name: 'Confirmar respuesta', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.quiz-choices .correct')).toHaveCount(1);
      }
      if (id === 'mystery') {
        await expect(page.locator('.mystery-private li')).toHaveCount(5);
        await page.getByRole('button', { name: 'Investigar hipótesis', exact: true }).click();
        await expect(
          page.getByRole('heading', { name: 'Hipótesis pública', exact: true }),
        ).toBeVisible();
      }
      if (id === 'conquest') {
        await page.getByRole('button', { name: 'Añadir refuerzos', exact: true }).click();
        await page.getByRole('button', { name: 'Ampliar mapa', exact: true }).click();
        expect(
          await page.locator('.conquest-map svg').evaluate((node) => node.clientWidth),
        ).toBeGreaterThanOrEqual(700);
        await page.getByRole('button', { name: 'Ajustar mapa', exact: true }).click();
        await page.getByRole('button', { name: 'Territorios y control', exact: true }).click();
        await expect(page.locator('.conquest-regions li')).toHaveCount(18);
      }
      if (id === 'brisca') {
        await expect(page.locator('.spanish-hand > button')).toHaveCount(3);
        await page.locator('.spanish-hand > button').first().click();
        await page.getByRole('button', { name: 'Jugar carta', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.spanish-hand > button')).toHaveCount(2);
        await page.getByRole('button', { name: 'Ver cartas ganadas', exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('Cartas ganadas');
        await expect(page.locator('.brisca-captured')).toBeVisible();
      }
      if (id === 'mahjong') {
        await expect(page.locator('.mahjong-hand > button')).toHaveCount(14);
        await expect(page.locator('.mahjong-seat')).toHaveCount(4);
        await page.getByRole('button', { name: 'Ver descartes', exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('Descartes de los jugadores');
        await page.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        await page.locator('.mahjong-hand > button').first().click();
        const discard = page.getByRole('button', { name: 'Descartar ficha', exact: true });
        await discard.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.mahjong-hand > button')).toHaveCount(13);
      }
      if (id === 'chinesecheckers') {
        await expect(page.locator('.chinese-hole')).toHaveCount(121);
        if (width === 320) {
          await expect(
            page.getByRole('button', { name: 'Ampliar tablero', exact: true }),
          ).toBeVisible();
          await page.getByRole('button', { name: 'Ampliar tablero', exact: true }).click();
          expect(
            await page.locator('.chinese-board').evaluate((node) => node.clientWidth),
          ).toBeGreaterThanOrEqual(510);
          await page.getByRole('button', { name: 'Ver tablero completo', exact: true }).click();
          expect(
            await page.locator('.chinese-board').evaluate((node) => node.clientWidth),
          ).toBeLessThan(320);
        }
        await page.getByRole('combobox', { name: 'Ficha', exact: true }).selectOption({ index: 8 });
        const destination = page.getByRole('combobox', { name: 'Destino', exact: true });
        await expect(destination.locator('option')).not.toHaveCount(1);
        await destination.selectOption({ index: 1 });
        const confirm = page.getByRole('button', { name: 'Confirmar movimiento', exact: true });
        await confirm.focus();
        await page.keyboard.press('Enter');
        await expect(
          page.getByRole('status').filter({ hasText: 'Movimiento confirmado' }),
        ).toBeVisible();
      }
      if (id === 'go') {
        await expect(page.locator('.go-board button')).toHaveCount(81);
        const first = page.locator('.go-board button').first();
        await first.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.go-stone.black')).toHaveCount(1);
        await page.locator('.go-board button').nth(10).focus();
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('.go-board button').nth(11)).toBeFocused();
      }
      if (id === 'oca') {
        await page
          .getByRole('button', { name: 'Estado y casillas especiales', exact: true })
          .click();
        await expect(page.locator('.oca-players li')).toHaveCount(2);
        await expect(page.locator('.oca-guide')).toContainText('Posada');
        await page.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        await page.getByRole('button', { name: 'Tirar dados', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page
          .getByRole('button', { name: 'Estado y casillas especiales', exact: true })
          .click();
        await expect(page.locator('.oca-players li').first()).not.toContainText('Casilla 0:');
      }
      if (id === 'parchis') {
        await expect(page.locator('.parchis-pawns button')).toHaveCount(4);
        const moves = page.locator('.parchis-pawns button:enabled');
        for (let attempt = 0; attempt < 40 && (await moves.count()) === 0; attempt++) {
          await page.getByRole('button', { name: 'Tirar dados', exact: true }).click();
          await expect
            .poll(
              async () =>
                (await moves.count()) > 0 ||
                (await page.getByRole('button', { name: 'Tirar dados', exact: true }).isEnabled()),
            )
            .toBe(true);
        }
        await expect(moves.first()).toBeEnabled();
        await moves.first().focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.parchis-pawns')).toContainText('Casilla 5');
        if (width === 1280) {
          await expect
            .poll(() =>
              page.evaluate(() =>
                (window as ParchisMotionWindow).parchisMotion.some((frames) =>
                  frames.some((frame) => String(frame.transform).includes('translate(')),
                ),
              ),
            )
            .toBe(true);
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await expect
            .poll(() =>
              page
                .locator('[data-motion-id]')
                .evaluateAll((nodes) => nodes.flatMap((node) => node.getAnimations()).length),
            )
            .toBe(0);
        }
        await page.getByRole('button', { name: 'Estado de todas las fichas', exact: true }).click();
        await expect(page.locator('.parchis-positions')).toContainText('Ficha 1: Casilla 5');
      }
      if (id === 'chess') {
        await page.getByRole('button', { name: 'e2: Blancas Peón', exact: true }).click();
        await page.getByRole('button', { name: 'e4: vacía, jugada válida', exact: true }).click();
        await expect(
          page.getByRole('button', { name: 'e4: Blancas Peón', exact: true }),
        ).toBeVisible();
        await page.getByRole('button', { name: /Historial de jugadas/ }).click();
        await expect(page.getByRole('dialog')).toContainText('e4');
      }
      if (id === 'checkers') {
        await page.locator('.checkers-board button:not([disabled])').first().click();
        await page.locator('.checkers-board .legal-square').first().click();
      }
      if (id === 'mancala') {
        await page.locator('.mancala-row').nth(1).locator('button:not([disabled])').first().click();
      }
      if (id === 'rummy') {
        await expect(page.locator('.number-tile-rack > button')).toHaveCount(14);
        await page.locator('.number-tile-rack > button').first().click();
        await page.getByRole('button', { name: /Crear combinación/ }).click();
        await expect(page.locator('.invalid-tile-set')).toHaveCount(1);
        await expect(
          page.getByRole('button', { name: 'Confirmar jugada', exact: true }),
        ).toBeDisabled();
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
        await expect(page.locator('.number-tile-rack > button')).toHaveCount(14);
        await page.getByRole('button', { name: 'Robar una ficha y pasar', exact: true }).click();
        await expect(page.locator('.number-tile-rack > button')).toHaveCount(15);
      }
      if (id === 'dominoes') {
        const playable = page.locator('.domino-hand > button:not([disabled])');
        const draw = page.getByRole('button', { name: 'Robar ficha', exact: true });
        await expect
          .poll(async () => (await playable.count()) > 0 || (await draw.isEnabled()))
          .toBe(true);
        if (await draw.isEnabled()) {
          // A legal opening by the bot can leave our random hand without a matching number.
          const count = await page.locator('.domino-hand > button').count();
          await draw.click();
          await expect(page.locator('.domino-hand > button')).toHaveCount(count + 1);
        } else {
          await playable.first().click();
          await page.locator('.board-actions .primary:not([disabled])').first().click();
        }
        await expect(page.locator('.domino-chain .domino-tile')).not.toHaveCount(0);
      }
      if (id === 'backgammon') {
        if (width === 320) {
          const widths = await page
            .locator('.bg-point')
            .evaluateAll((points) => points.map((point) => point.getBoundingClientRect().width));
          expect(widths).toHaveLength(24);
          expect(Math.min(...widths)).toBeGreaterThanOrEqual(24);
        }
        const roll = page.getByRole('button', { name: 'Tirar dados', exact: true });
        if (await roll.isVisible()) await roll.click();
        await page.locator('.bg-moves button').filter({ hasText: '→' }).first().click();
      }
      if (id === 'impostor') {
        await page.getByRole('button', { name: 'Ver mi papel', exact: true }).click();
        await expect(page.locator('.secret-reveal')).toBeVisible();
        await page.getByRole('button', { name: 'Ocultar mi papel', exact: true }).click();
        await page.getByRole('textbox', { name: 'Tu pista', exact: true }).fill('misterio');
        await page.getByRole('button', { name: 'Enviar pista', exact: true }).click();
        await expect(page.locator('.clue-card').filter({ hasText: 'misterio' })).toHaveCount(1);
      }
      if (id === 'battleship') {
        await page.getByRole('button', { name: 'Colocación aleatoria', exact: true }).click();
        await expect(page.locator('.naval-grid .ship')).toHaveCount(17);
        await page.getByRole('button', { name: 'Flota lista', exact: true }).click();
        await expect(page.getByRole('group', { name: 'Flota rival', exact: true })).toBeVisible();
        await page
          .getByRole('group', { name: 'Flota rival', exact: true })
          .getByRole('button')
          .first()
          .click();
      }
      if (id === 'combinations') {
        await page.getByRole('button', { name: 'Tirar dados', exact: true }).click();
        await page.locator('.combination-dice > button').first().click();
        await expect(page.locator('.combination-dice > button').first()).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        await page.getByRole('button', { name: 'Volver a tirar', exact: true }).click();
        await page.getByRole('button', { name: /Anotar Azar:/ }).click();
      }
      let mysteryNoteIndex = -1;
      if (id === 'mystery') {
        const note = page.locator('.mystery-notebook input:not([disabled])').last();
        mysteryNoteIndex = await note.evaluate((element) =>
          [...document.querySelectorAll('.mystery-notebook input')].indexOf(
            element as HTMLInputElement,
          ),
        );
        await note.check();
        await expect
          .poll(() =>
            page.evaluate((index) => {
              const entry = Object.entries(sessionStorage).find(([key]) =>
                key.startsWith('sobremesa.mystery-notes.v1:'),
              );
              return entry ? (JSON.parse(entry[1]) as number[]).includes(index) : false;
            }, mysteryNoteIndex),
          )
          .toBe(true);
      }
      await page.reload();
      await expect(page.locator(`.extended-${id}`)).toBeVisible();
      if (id === 'mystery') {
        await expect(page.locator('.mystery-notebook input').nth(mysteryNoteIndex)).toBeChecked();
        await expect
          .poll(() =>
            page.evaluate((index) => {
              const entry = Object.entries(sessionStorage).find(([key]) =>
                key.startsWith('sobremesa.mystery-notes.v1:'),
              );
              return entry ? (JSON.parse(entry[1]) as number[]).includes(index) : false;
            }, mysteryNoteIndex),
          )
          .toBe(true);
      }
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (width === 1280) {
        for (const viewport of [
          { width: 1280, height: 720 },
          { width: 1366, height: 768 },
          { width: 1440, height: 900 },
          { width: 768, height: 1024 },
          { width: 360, height: 640 },
          { width: 390, height: 844 },
          { width: 844, height: 390 },
        ]) {
          await page.setViewportSize(viewport);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${id}: ${JSON.stringify(viewport)}`,
          ).toBe(true);
        }
        await page.setViewportSize({ width: 1280, height: 720 });
        const priority = (
          {
            words: '.words-scroll',
            poker: '.poker-table',
            chinesecheckers: '.chinese-controls',
            parchis: '.parchis-pawns',
            backgammon: '.backgammon-board',
            combinations: '.combination-dice',
          } as Record<string, string>
        )[id];
        if (priority) await expect(page.locator(priority)).toBeInViewport({ ratio: 1 });
        await page.screenshot({
          path: `tests/.output/screenshots/${id}-desktop.png`,
          fullPage: true,
        });
      }
      const resultDialog = page.getByRole('dialog').filter({
        has: page.locator('.result-content'),
      });
      const dismissResult = async () => {
        for (let attempt = 0; attempt < 2 && (await resultDialog.isVisible()); attempt++) {
          await resultDialog
            .getByRole('button', { name: /^(Ver la mesa|View the table)$/ })
            .click();
          await expect(resultDialog).toHaveCount(0);
        }
      };
      await dismissResult();
      await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
      await dismissResult();
      const spanishPreferences = page.getByRole('dialog', { name: 'Preferencias', exact: true });
      await expect(spanishPreferences).toBeVisible();
      await page
        .getByRole('dialog', { name: 'Preferencias', exact: true })
        .getByRole('button', { name: 'Inglés', exact: true })
        .click();
      await page.keyboard.press('Escape');
      await dismissResult();
      const englishPreferences = page.getByRole('dialog', { name: 'Preferences', exact: true });
      if (await englishPreferences.isVisible()) await page.keyboard.press('Escape');
      await dismissResult();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: `${english}.`, exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Rules', exact: true }).click();
      await expect(page.getByRole('dialog')).toContainText(english);
      await page.keyboard.press('Escape');
      await dismissResult();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const a11y = await accessibilityAudit(page).analyze();
      expect(
        a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
      if (width === 320)
        await page.screenshot({
          path: `tests/.output/screenshots/${id}-mobile.png`,
          fullPage: true,
        });
      await page.getByRole('button', { name: 'Leave game', exact: true }).click();
      const leaveConfirmation = page
        .getByRole('dialog')
        .getByRole('button', { name: 'Leave game', exact: true });
      if (await leaveConfirmation.isVisible()) await leaveConfirmation.click();
      if (id === 'mystery')
        await expect
          .poll(() =>
            page.evaluate(() =>
              Object.keys(sessionStorage).some((key) =>
                key.startsWith('sobremesa.mystery-notes.v1:'),
              ),
            ),
          )
          .toBe(false);
      await expect(page.locator('.game-card')).toHaveCount(30);
    });

test('Impostor: tres personas, secreto privado, victoria de equipo y consultar la mesa', async ({
  page,
  browser,
}) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  try {
    const pages = [page, await contexts[0].newPage(), await contexts[1].newPage()],
      names = ['Ana', 'Bruno', 'Clara'];
    for (let i = 0; i < pages.length; i++) {
      await pages[i].addInitScript(
        (name) => localStorage.setItem('sobremesa.name', name),
        names[i],
      );
      await ready(pages[i]);
    }
    await page.locator('.game-impostor .play-friends').click();
    const code = (await page.locator('.room-code-text').innerText()).trim();
    for (const guest of pages.slice(1)) {
      await guest.getByRole('button', { name: 'Unirme a amigos', exact: true }).click();
      await guest.getByRole('textbox', { name: 'Código de la sala', exact: true }).fill(code);
      await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    let impostor = -1;
    for (let i = 0; i < pages.length; i++) {
      await pages[i].getByRole('button', { name: 'Ver mi papel', exact: true }).click();
      if (await pages[i].getByText('Eres el impostor', { exact: true }).isVisible()) impostor = i;
      await pages[i].getByRole('button', { name: 'Ocultar mi papel', exact: true }).click();
    }
    expect(impostor).toBeGreaterThanOrEqual(0);
    for (let round = 0; round < 2; round++)
      for (const p of pages) {
        await p.getByRole('textbox', { name: 'Tu pista', exact: true }).fill('misterio');
        await p.getByRole('button', { name: 'Enviar pista', exact: true }).click();
      }
    for (let i = 0; i < pages.length; i++) {
      const target = i === impostor ? (impostor + 1) % 3 : impostor;
      await pages[i].getByRole('button', { name: `Votar a ${names[target]}`, exact: true }).click();
    }
    await pages[impostor]
      .getByRole('textbox', { name: '¿Cuál es la palabra secreta?', exact: true })
      .fill('incorrecta');
    await pages[impostor].getByRole('button', { name: 'Confirmar respuesta', exact: true }).click();
    const winners = names.filter((_, i) => i !== impostor);
    for (let i = 0; i < pages.length; i++) {
      const result = pages[i].getByRole('dialog');
      await expect(result).toContainText(`Ganadores: ${winners.join(', ')}`);
      await expect(result).toContainText(`Impostor: ${names[impostor]}`);
      if (i !== impostor)
        await expect(
          result.getByRole('heading', { name: '¡Has ganado!', exact: true }),
        ).toBeVisible();
      await result.getByRole('button', { name: 'Ver la mesa', exact: true }).click();
      await expect(pages[i].getByRole('dialog')).toHaveCount(0);
      await pages[i].getByRole('button', { name: 'Ver resultado', exact: true }).click();
      await expect(pages[i].getByRole('dialog')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Preparar otra partida', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeVisible();
  } finally {
    for (const context of contexts) await context.close();
  }
});

test('Go: dos personas revisan muertos, reanudan y acuerdan el resultado', async ({
  page,
  browser,
}) => {
  const context = await browser.newContext();
  try {
    await ready(page);
    await page.locator('.game-go .play-friends').click();
    const code = (await page.locator('.room-code-text').innerText()).trim(),
      guest = await context.newPage();
    await guest.addInitScript(() => {
      localStorage.setItem('sobremesa.name', 'Bruno');
      localStorage.setItem('sobremesa.locale', 'es');
      localStorage.setItem('sobremesa.profileConfirmed', 'true');
    });
    await guest.goto(`${new URL(page.url()).origin}/?room=${code}`);
    await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await page.locator('.go-board button').first().click();
    await guest.locator('.go-board button').nth(20).click();
    for (const current of [page, guest])
      await current.getByRole('button', { name: 'Pasar', exact: true }).click();
    await page.locator('.go-board button').first().click();
    await expect(page.locator('.go-dead')).toHaveCount(1);
    await page.getByRole('button', { name: 'Aceptar puntuación', exact: true }).click();
    await guest.getByRole('button', { name: 'Reanudar el juego', exact: true }).click();
    await expect(page.locator('.go-dead')).toHaveCount(0);
    await expect(page.locator('.go-stone.black')).toHaveCount(1);
    for (const current of [page, guest])
      await current.getByRole('button', { name: 'Pasar', exact: true }).click();
    await page.getByRole('button', { name: 'Aceptar puntuación', exact: true }).click();
    await guest.getByRole('button', { name: 'Aceptar puntuación', exact: true }).click();
    await expect(guest.getByRole('dialog')).toContainText('¡Has ganado!');
    await expect(page.getByRole('dialog')).toContainText('Partida terminada');
    await page.getByRole('button', { name: 'Preparar otra partida', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('Damas chinas: cinco participantes esperan y seis pueden jugar', async ({ page }) => {
  await ready(page);
  await page
    .getByRole('button', { name: 'Jugar a Damas chinas contra un bot', exact: true })
    .click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
    await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(i + 3);
  }
  await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeDisabled();
  await expect(
    page.getByText('Números de participantes admitidos: 2, 3, 4, 6', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.chinese-pawn')).toHaveCount(60);
});

test('Mahjong: cuatro personas conservan manos privadas, responden y reconectan', async ({
  page,
  browser,
}) => {
  const contexts = [],
    pages = [page];
  try {
    await ready(page);
    await page.locator('.game-mahjong .play-friends').click();
    const code = (await page.locator('.room-code-text').innerText()).trim();
    for (const playerName of ['Bruno', 'Clara', 'Diego']) {
      const context = await browser.newContext(),
        guest = await context.newPage();
      contexts.push(context);
      pages.push(guest);
      await guest.addInitScript((name) => {
        localStorage.setItem('sobremesa.name', name);
        localStorage.setItem('sobremesa.locale', 'es');
        localStorage.setItem('sobremesa.profileConfirmed', 'true');
      }, playerName);
      await guest.setViewportSize({ width: 320, height: 900 });
      await guest.goto(`${new URL(page.url()).origin}/?room=${code}`);
      await expect(
        guest.getByRole('button', { name: 'Unirme a la partida', exact: true }),
      ).toBeVisible();
      await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
    }
    await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(4);
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    for (let i = 0; i < 4; i++)
      await expect(pages[i].locator('.mahjong-hand > button')).toHaveCount(i === 0 ? 14 : 13);
    const hands = await Promise.all(
      pages.map((p) =>
        p
          .locator('.mahjong-hand [data-motion-id]')
          .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-motion-id'))),
      ),
    );
    expect(new Set(hands.flat()).size).toBe(53);
    for (const p of pages) await expect(p.locator('.mahjong-revealed')).toHaveCount(0);
    await page.locator('.mahjong-hand > button').first().click();
    await page.getByRole('button', { name: 'Descartar ficha', exact: true }).click();
    for (const p of pages.slice(1)) {
      const pass = p.getByRole('button', { name: 'Pasar reclamación', exact: true });
      await pass.scrollIntoViewIfNeeded();
      await expect(pass).toBeInViewport({ ratio: 0.99 });
      await pass.focus();
      await p.keyboard.press('Enter');
    }
    const next = pages[1];
    await next.getByRole('button', { name: 'Robar del muro', exact: true }).click();
    await expect(next.locator('.mahjong-hand > button')).toHaveCount(14);
    await expect(page.locator('.mahjong-hand > button')).toHaveCount(13);
    await expect(next.getByText(/Última ficha robada:/)).toBeVisible();
    await expect(page.getByText(/Última ficha robada:/)).toHaveCount(0);
    await next.reload();
    await expect(next.locator('.mahjong-hand > button')).toHaveCount(13);
    await expect(next.getByText(/Última ficha robada:/)).toHaveCount(0);
    await expect(next.locator('.table-player').filter({ hasText: 'Bruno' })).toContainText(
      'En la mesa',
    );
    await page.getByRole('button', { name: 'Salir de la partida', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Salir de la partida', exact: true })
      .click();
    await expect(next.getByRole('dialog')).toContainText(
      'La mano se cierra sin puntuación por abandono',
    );
    await next.getByRole('button', { name: 'Ver la mesa', exact: true }).click();
    await expect(next.locator('.mahjong-revealed')).toHaveCount(0);
  } finally {
    for (const context of contexts) await context.close();
  }
});
