import { test, expect, type Page } from '@playwright/test';
import { accessibilityAudit } from './accessibility';

async function ready(page: Page, name = 'Ana') {
  await page.addInitScript((name) => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', name);
  }, name);
  await page.goto('/');
  await expect(page.getByText('Listo para jugar', { exact: true })).toBeVisible();
}

for (const width of [1280, 360])
  test(`Amigos: código pegado, retirada confirmada y grupo multijuego (${width}px)`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 844 });
    await ready(page);
    await page.locator('.game-colorclash .play-friends').click();
    if ((await page.locator('#room-settings').getAttribute('open')) === null)
      await page.locator('#room-settings > summary').click();
    await page.getByRole('switch', { name: 'Permitir acumular +2 y +4', exact: true }).check();
    const code = (await page.locator('.room-code-text').innerText()).trim();
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    try {
      const guest = await context.newPage();
      await ready(guest, 'Bruno');
      const join = guest.getByRole('button', { name: 'Unirme a amigos', exact: true });
      const box = (await join.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await join.click();
      await guest
        .getByRole('textbox', { name: 'Código de la sala', exact: true })
        .fill(` ${code.toLowerCase().split('').join(' ')} `);
      await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
      await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
      await expect(guest.locator('#group-game')).toBeDisabled();
      await page.getByRole('button', { name: 'Retirar a Bruno', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Retirar a Bruno', exact: true }),
      ).toBeFocused();
      await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
      await page.getByRole('button', { name: 'Retirar a Bruno', exact: true }).click();
      await page.getByRole('button', { name: 'Retirar del grupo', exact: true }).click();
      await expect(
        guest.getByText('El anfitrión te ha retirado de la sala.', { exact: true }),
      ).toBeVisible();
      await guest.reload();
      await expect(guest.locator('.room-code-text')).toHaveCount(0);
      await expect(
        guest.getByRole('button', { name: 'Unirme a amigos', exact: true }),
      ).toBeVisible();
      await guest.goto(`/?room=${code}`);
      await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
      await page.locator('#group-game').selectOption('tictactoe');
      await expect(guest.locator('#group-game')).toHaveValue('tictactoe');
      await expect(page.locator('.room-code-text')).toHaveText(code);
      await page.reload();
      await expect(page.locator('#group-game')).toHaveValue('tictactoe');
      await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
      await expect(guest.locator('.ttt-board')).toBeVisible();
      for (const [actor, index] of [
        [page, 0],
        [guest, 3],
        [page, 1],
        [guest, 4],
        [page, 2],
      ] as const) {
        await expect(actor.locator('.ttt-board button').nth(index)).toBeEnabled();
        await actor.locator('.ttt-board button').nth(index).click();
      }
      await expect(page.locator('.result-content')).toBeVisible();
      await guest.getByRole('button', { name: 'Volver al grupo', exact: true }).click();
      await expect(guest.locator('#group-game')).toHaveValue('tictactoe');
      await guest.getByRole('button', { name: 'Ver resultado', exact: true }).click();
      await expect(guest.locator('.result-content')).toBeVisible();
      await page.getByRole('button', { name: 'Volver al grupo', exact: true }).click();
      await page.locator('#group-game').selectOption('colorclash');
      if ((await page.locator('#room-settings').getAttribute('open')) === null)
        await page.locator('#room-settings > summary').click();
      await expect(
        page.getByRole('switch', { name: 'Permitir acumular +2 y +4', exact: true }),
      ).toBeChecked();
      await expect(guest.locator('#group-game')).toHaveValue('colorclash');
      await expect(guest.locator('.room-code-text')).toHaveText(code);
      await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
      expect((await accessibilityAudit(page).analyze()).violations).toEqual([]);
      await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
      await expect(guest.locator('.color-table')).toBeVisible();
    } finally {
      await context.close();
    }
  });

test('Ajedrez: flechas, selección reversible y Escape no abandona el modo inmersivo', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new Error('denied'));
  });
  await ready(page);
  await page.locator('.game-chess .play-bot').click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  const pawn = page.locator('.chess-board [data-cell="e2"]');
  await pawn.click();
  await expect(pawn).toHaveAttribute('aria-pressed', 'true');
  await pawn.click();
  await expect(pawn).toHaveAttribute('aria-pressed', 'false');
  await pawn.click();
  await pawn.press('ArrowRight');
  await expect(page.locator('.chess-board [data-cell="f2"]')).toBeFocused();
  await page.getByRole('button', { name: 'Ampliar el juego', exact: true }).click();
  await pawn.focus();
  await pawn.press('Escape');
  await expect(pawn).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.game-page')).toHaveClass(/game-immersive/);
  await pawn.press('Escape');
  await expect(page.locator('.game-page')).not.toHaveClass(/game-immersive/);
});

test('Un estado o inicio tardío de otro motor no reemplaza la partida actual', async ({ page }) => {
  let publishOld: () => void = () => {
    throw new Error('Falta la partida inicial');
  };
  let publishWrongGame: () => void = () => {
    throw new Error('Falta la partida actual');
  };
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (typeof message === 'string' && message.startsWith('42')) {
        const packet = JSON.parse(message.slice(2));
        if (packet[0] === 'game:started') {
          const state = packet[1].publicState;
          if (state.gameType === 'tictactoe')
            publishOld = () => {
              route.send('42' + JSON.stringify(['game:state_update', state]));
              route.send('42' + JSON.stringify(packet));
            };
          if (state.gameType === 'chess')
            publishWrongGame = () => {
              route.send(
                '42' + JSON.stringify(['game:state_update', { ...state, gameType: 'tictactoe' }]),
              );
            };
        }
      }
      route.send(message);
    });
  });
  await ready(page);
  await page.locator('.game-tictactoe .play-bot').click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.ttt-board')).toBeVisible();
  // El bot conserva las mismas reglas de juego: completar la partida a través de sus controles.
  for (let step = 0; step < 5 && !(await page.locator('.result-content').count()); step++) {
    await expect
      .poll(
        async () =>
          (await page.locator('.ttt-board button:enabled').count()) +
          (await page.locator('.result-content').count()),
      )
      .toBeGreaterThan(0);
    if (await page.locator('.result-content').count()) break;
    await page.locator('.ttt-board button:enabled').first().click();
  }
  await expect(page.locator('.result-content')).toBeVisible();
  await page.getByRole('button', { name: 'Volver al grupo', exact: true }).click();
  await page.locator('#group-game').selectOption('chess');
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.chess-board')).toBeVisible();
  publishOld();
  publishWrongGame();
  await page.getByRole('button', { name: 'Reglas', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Ajedrez');
  await page.keyboard.press('Escape');
  await expect(page.locator('.chess-board button')).toHaveCount(64);
  await expect(page.locator('.ttt-board')).toHaveCount(0);
});

test('Anfitrión: retirar un desconectado durante el juego aplica el abandono y conserva el grupo', async ({
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
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await expect(guest.locator('.ttt-board')).toBeVisible();
    await page.getByRole('button', { name: 'Preferencias de partida', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retirar a Bruno', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await context.setOffline(true);
    await guest.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('.game-message')).toContainText('reconectando');
    await page.getByRole('button', { name: 'Preferencias de partida', exact: true }).click();
    await page.getByRole('button', { name: 'Retirar a Bruno', exact: true }).click();
    await page.getByRole('button', { name: 'Retirar del grupo', exact: true }).click();
    await expect(page.getByRole('heading', { name: '¡Has ganado!', exact: true })).toBeVisible();
    await expect(page.locator('.result-content')).toContainText('Ana');
    await page.getByRole('button', { name: 'Volver al grupo', exact: true }).click();
    await expect(page.locator('.room-code-text')).toHaveText(code);
    await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(1);
    await context.setOffline(false);
    await guest.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(guest.locator('.game-card')).toHaveCount(30);
    await expect(guest.locator('.room-code-text')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
