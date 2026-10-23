import { test, expect, type Page } from '@playwright/test';
import { accessibilityAudit } from './accessibility';

async function ready(page: Page, name = 'Ana') {
  await page.addInitScript((name) => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
    localStorage.setItem('sobremesa.name', name);
  }, name);
  await page.goto('/');
  await expect(page.locator('.connection')).toBeVisible();
  await expect(page.locator('.connection')).toHaveAttribute('aria-label', 'Listo para jugar');
}

async function changeGroupGame(page: Page, id: string) {
  await page.getByRole('button', { name: 'Cambiar juego', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar juegos', exact: true }).fill(id);
  await page.locator(`.room-game-option[data-game-id="${id}"]`).click();
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
    await expect(page.getByRole('button', { name: 'Reglas', exact: true })).toBeVisible();
    const headerOrder = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('.room-header-tools button')];
      return buttons.map((button) => button.getBoundingClientRect().x);
    });
    expect(headerOrder).toHaveLength(3);
    expect(headerOrder[0]).toBeLessThan(headerOrder[1]);
    expect(headerOrder[1]).toBeLessThan(headerOrder[2]);
    await page.getByRole('button', { name: 'Reglas', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Opciones de esta partida');
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Copiar enlace de invitación', exact: true }),
    ).toBeVisible();
    const inviteLayout = await page.evaluate(() => {
      const codeElement = document.querySelector('.room-code-group')!;
      const linkElement = document.querySelector('.invite-link-button')!;
      const code = codeElement.getBoundingClientRect();
      const link = linkElement.getBoundingClientRect();
      const card = document.querySelector('.invite-card')!.getBoundingClientRect();
      const codeText = document.querySelector('.room-code-text')!;
      return {
        codeBottom: code.bottom,
        codeTop: code.top,
        codeHeight: code.height,
        linkTop: link.top,
        linkBottom: link.bottom,
        linkHeight: link.height,
        codeLeft: code.left,
        codeRight: code.right,
        linkLeft: link.left,
        linkRight: link.right,
        cardRight: card.right,
        codeFits: codeText.scrollWidth <= codeText.clientWidth,
      };
    });
    expect(inviteLayout.codeFits).toBe(true);
    expect(Math.abs(inviteLayout.codeHeight - inviteLayout.linkHeight)).toBeLessThanOrEqual(1);
    if (width > 600) {
      expect(inviteLayout.codeLeft).toBeLessThan(inviteLayout.linkLeft);
      expect(inviteLayout.codeRight).toBeLessThanOrEqual(inviteLayout.linkLeft);
      expect(inviteLayout.cardRight - inviteLayout.linkRight).toBeLessThanOrEqual(1);
      expect(inviteLayout.codeTop).toBeLessThan(inviteLayout.linkBottom);
      expect(inviteLayout.linkTop).toBeLessThan(inviteLayout.codeBottom);
    } else expect(inviteLayout.codeBottom).toBeLessThan(inviteLayout.linkTop);
    await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
    const preferences = page.getByRole('dialog', { name: 'Preferencias', exact: true });
    await expect(preferences.getByRole('button', { name: 'Español', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(preferences.getByRole('button', { name: 'Inglés', exact: true })).toBeVisible();
    await expect(preferences.getByRole('switch', { name: 'Sonido', exact: true })).toBeChecked();
    await expect(preferences.getByRole('slider', { name: 'Volumen' })).toHaveValue('25');
    await page.keyboard.press('Escape');
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
      await expect(
        guest.getByRole('button', { name: 'Cambiar juego', exact: true }),
      ).toBeDisabled();
      await expect(
        guest.getByRole('button', { name: 'Gestionar participantes', exact: true }),
      ).toHaveCount(0);
      await expect(guest.getByRole('button', { name: 'Retirar a Bruno', exact: true })).toHaveCount(
        0,
      );
      await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Quitar bot', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Quitar bot', exact: true }).click();
      const removeBruno = page.getByRole('button', { name: 'Retirar a Bruno', exact: true });
      await expect(removeBruno).toBeVisible();
      await removeBruno.click();
      await expect(page.getByRole('dialog')).toContainText('Retirarás a Bruno');
      await page.keyboard.press('Escape');
      await expect(removeBruno).toBeFocused();
      await expect(page.locator('.waiting-player:not(.empty-seat)')).toHaveCount(2);
      await removeBruno.click();
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
      await changeGroupGame(page, 'tictactoe');
      await expect(guest.locator('.waiting-intro h1')).toHaveText('Tres en Raya');
      await expect(page.locator('.room-code-text')).toHaveText(code);
      await page.reload();
      await expect(page.locator('.waiting-intro h1')).toHaveText('Tres en Raya');
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
      await page.getByRole('button', { name: 'Preparar otra partida', exact: true }).click();
      await expect(page.locator('.waiting-intro h1')).toHaveText('Tres en Raya');
      await expect(guest.locator('.waiting-intro h1')).toHaveText('Tres en Raya');
      await changeGroupGame(page, 'colorclash');
      await expect(
        page.getByRole('switch', { name: 'Permitir acumular +2 y +4', exact: true }),
      ).toBeChecked();
      await expect(guest.locator('.waiting-intro h1')).toHaveText('Cambio de Color');
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
  await page.getByRole('button', { name: 'Preparar otra partida', exact: true }).click();
  await changeGroupGame(page, 'chess');
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

test('Anfitrión: puede confirmar la retirada anticipada de un desconectado', async ({
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
    await expect(
      guest.getByRole('button', { name: 'Gestionar participantes', exact: true }),
    ).toHaveCount(0);
    await context.setOffline(true);
    await guest.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('.game-message-detail')).toHaveText(
      'Bruno ha perdido la conexión. Puede volver mientras su plaza siga disponible.',
    );
    await page.getByRole('button', { name: 'Gestionar participantes', exact: true }).click();
    const management = page.getByRole('dialog', { name: 'Gestionar participantes', exact: true });
    await expect(management).toContainText('Bruno');
    await management.getByRole('button', { name: 'Retirar a Bruno' }).click();
    const confirmation = page.getByRole('dialog', { name: '¿Retirar a este participante?' });
    await expect(confirmation).toContainText('El juego aplicará su política de abandono');
    await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await context.setOffline(false);
    await guest.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.locator('.players-panel .table-player')).toHaveCount(2);
    await expect(guest.locator('.players-panel .table-player')).toHaveCount(2);
    await expect(page.locator('.game-message')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
