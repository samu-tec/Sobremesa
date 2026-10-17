import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const games = [
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
      await page.setViewportSize({ width, height: 900 });
      await ready(page);
      await page
        .getByRole('button', { name: `Jugar a ${name} contra un bot`, exact: true })
        .click();
      await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(
        id === 'impostor' ? 3 : 2,
      );
      await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
      await expect(page.locator(`.extended-${id}`)).toBeVisible();
      await expect(page.getByText('Es tu turno', { exact: true })).toBeVisible();
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
      const a11y = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
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
      await expect(page.locator('.game-card')).toHaveCount(15);
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
