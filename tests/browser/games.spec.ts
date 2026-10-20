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
  ['rummy', 'Rummy de fichas', 'Tile Rummy'],
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
  await expect(page.getByText('Listo para jugar', { exact: true })).toBeVisible();
}
for (const width of [1280, 320])
  for (const [id, name, english] of games)
    test(`${name}: jugar, reconectar e idioma a ${width}px`, async ({ page }) => {
      if (id === 'parchis') test.setTimeout(60000);
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
      await expect(page.getByText('Es tu turno', { exact: true })).toBeVisible();
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
      }
      if (id === 'cinquillo') {
        const cards = await page.locator('.spanish-hand > button').count();
        await page.locator('.spanish-hand > button:enabled').first().click();
        await page.getByRole('button', { name: 'Colocar carta', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.spanish-hand > button')).toHaveCount(cards - 1);
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
        await expect(page.locator('.conquest-regions li')).toHaveCount(18);
      }
      if (id === 'brisca') {
        await expect(page.locator('.spanish-hand > button')).toHaveCount(3);
        await page.locator('.spanish-hand > button').first().click();
        await page.getByRole('button', { name: 'Jugar carta', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.spanish-hand > button')).toHaveCount(2);
        await page.locator('.brisca-captured summary').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.brisca-captured')).toHaveAttribute('open', '');
      }
      if (id === 'mahjong') {
        await expect(page.locator('.mahjong-hand > button')).toHaveCount(14);
        await expect(page.locator('.mahjong-seat')).toHaveCount(4);
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
        await expect(page.locator('.oca-players li')).toHaveCount(2);
        await page.getByRole('button', { name: 'Tirar dados', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect
          .poll(async () => await page.locator('.oca-players li').first().textContent())
          .not.toContain('Casilla 0:');
        await page.locator('.oca-guide summary').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.oca-guide')).toContainText('Posada');
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
        await page.locator('.parchis-positions summary').click();
        await expect(page.locator('.parchis-positions')).toContainText('Ficha 1: Casilla 5');
      }
      if (id === 'chess') {
        await page.getByRole('button', { name: 'e2: Blancas Peón', exact: true }).click();
        await page.getByRole('button', { name: 'e4: vacía, jugada válida', exact: true }).click();
        await expect(
          page.getByRole('button', { name: 'e4: Blancas Peón', exact: true }),
        ).toBeVisible();
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
      await page.reload();
      await expect(page.locator(`.extended-${id}`)).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.getByRole('combobox', { name: 'Idioma', exact: true }).selectOption('en');
      await expect(page.getByRole('heading', { name: `${english}.`, exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Rules', exact: true }).click();
      await expect(page.getByRole('dialog')).toContainText(english);
      await page.keyboard.press('Escape');
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
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Leave game', exact: true })
        .click();
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
      await guest.getByRole('button', { name: 'Tengo un código', exact: true }).click();
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
      await expect(pass).toBeInViewport({ ratio: 1 });
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
    await expect(next.locator('.mahjong-hand > button')).toHaveCount(14);
    await expect(next.getByRole('button', { name: 'Descartar ficha', exact: true })).toBeDisabled();
    await next.locator('.mahjong-hand > button').last().click();
    await expect(next.getByRole('button', { name: 'Descartar ficha', exact: true })).toBeEnabled();
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
