import { test, expect, type Page } from '@playwright/test';
import { accessibilityAudit } from './accessibility';

async function ready(page: Page, name = 'Ana') {
  await page.addInitScript((name) => {
    localStorage.setItem('sobremesa.locale', 'es');
    localStorage.setItem('sobremesa.name', name);
    localStorage.setItem('sobremesa.profileConfirmed', 'true');
  }, name);
  await page.goto('/');
  await expect(page.locator('.connection')).toBeVisible();
  await expect(page.locator('.connection')).toHaveAttribute('aria-label', 'Listo para jugar');
}

test('Cambio de Color: configurar, jugar una partida real entre amigos y conservar la variante en la revancha', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await ready(page);
  await page.locator('.game-colorclash .play-friends').click();
  const stacking = page.getByRole('switch', { name: 'Permitir acumular +2 y +4', exact: true });
  const jumpIn = page.getByRole('switch', { name: 'Permitir Jump-In', exact: true });
  await expect(stacking).not.toBeChecked();
  await expect(jumpIn).not.toBeChecked();
  await expect(page.locator('.game-setting').filter({ has: stacking })).not.toContainText(
    'Desactivada por defecto',
  );
  await expect(page.locator('.game-setting').filter({ has: jumpIn })).not.toContainText(
    'Desactivada por defecto',
  );
  await stacking.check();
  await jumpIn.check();
  await page.getByRole('combobox', { name: 'Cartas iniciales', exact: true }).selectOption('5');
  await page.reload();
  await expect(stacking).toBeChecked();
  const code = (await page.locator('.room-code-text').innerText()).trim();
  const context = await browser.newContext();
  try {
    const guest = await context.newPage();
    await ready(guest, 'Bruno');
    await guest.goto(`/?room=${code}`);
    await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
    await expect(
      guest.getByText('El anfitrión iniciará la partida.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await expect(page.locator('.color-table')).toBeVisible();
    await page.getByRole('button', { name: 'Reglas', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Permitir acumular +2 y +4: Sí');
    await expect(page.getByRole('dialog')).toContainText('Permitir Jump-In: Sí');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    let moves = 0;
    for (; moves < 500 && !(await page.locator('.result-content').count()); moves++) {
      await expect
        .poll(
          async () =>
            (await page
              .locator('.hand-card:enabled,.draw-deck:enabled,.pass-button:enabled')
              .count()) +
            (await guest
              .locator('.hand-card:enabled,.draw-deck:enabled,.pass-button:enabled')
              .count()) +
            (await page.locator('.result-content').count()),
        )
        .toBeGreaterThan(0);
      if (await page.locator('.result-content').count()) break;
      const actor = (await page
        .locator('.hand-card:enabled,.draw-deck:enabled,.pass-button:enabled')
        .count())
        ? page
        : guest;
      const revision = Number(
        await actor.locator('.color-table').getAttribute('data-action-number'),
      );
      const cards = actor.locator('.hand-card:enabled');
      if (await cards.count()) {
        const penalties = cards.filter({ hasText: /\+[24]/ });
        await ((await penalties.count()) ? penalties.first() : cards.first()).click();
        const chooser = actor.locator('.color-choice-panel');
        if (await chooser.count()) {
          const counts = await chooser.locator('button small').allTextContents();
          const index = counts.map(Number).indexOf(Math.max(...counts.map(Number)));
          await chooser.locator('.color-choices button').nth(index).click();
        }
      } else {
        await actor.locator('.draw-deck:enabled,.pass-button:enabled').first().click();
      }
      await expect(actor.locator('.color-table')).toHaveAttribute(
        'data-action-number',
        String(revision + 1),
      );
    }
    expect(moves).toBeGreaterThan(0);
    await expect(page.locator('.result-content')).toBeVisible();
    await page.getByRole('button', { name: 'Preparar otra partida', exact: true }).click();
    await expect(stacking).toBeChecked();
    await expect(jumpIn).toBeChecked();
    await expect(page.locator('.room-code-text')).toHaveText(code);
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    await expect(guest.locator('.table-player.active small')).toHaveText('Es tu turno');
    await expect(page.locator('.color-player-order > li').first()).toContainText('Bruno');
  } finally {
    await context.close();
  }
});

for (const direction of [1, -1])
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ])
    test(`Cambio de Color: orden autoritativo, +10, cartas válidas y selector estable (${direction}, ${viewport.width}px)`, async ({
      page,
    }) => {
      if (direction === 1 && viewport.width === 390)
        await page.addInitScript(() => {
          Element.prototype.requestFullscreen = () =>
            Promise.reject(new Error('Fullscreen unavailable'));
        });
      // Only this visual scenario replaces the public projection; the real engine and server
      // are covered by the complete match above and the deterministic engine/room tests.
      await page.routeWebSocket('**/socket.io/**', (route) => {
        const server = route.connectToServer();
        server.onMessage((message) => {
          if (typeof message === 'string' && message.startsWith('42')) {
            const packet = JSON.parse(message.slice(2));
            if (packet[0] === 'game:started' && packet[1].gameType === 'colorclash') {
              const state = packet[1].publicState;
              const [a, b, c, d] = state.playerOrder;
              state.playerOrder = [a, c, d, b];
              state.currentTurnPlayerId = a;
              state.turnDirection = direction;
              state.pendingDraw = 10;
              state.activeColor = 'red';
              state.topDiscardCard = { id: 'top-four', color: 'wild', value: 'wild_draw4' };
              state.drawPileCount = 81;
              state.stackDrawCards = true;
              state.actionNumber = 40;
              state.lastEvent = 'stack';
              state.myHand = [
                { id: 'normal', color: 'red', value: '3' },
                { id: 'two', color: 'blue', value: 'draw2' },
                { id: 'four', color: 'wild', value: 'wild_draw4' },
                { id: 'wild', color: 'wild', value: 'wild' },
                { id: 'reverse', color: 'red', value: 'reverse' },
              ];
              state.opponents.reverse();
              route.send('42' + JSON.stringify(packet));
              return;
            }
          }
          route.send(message);
        });
      });
      await page.setViewportSize(viewport);
      await ready(page);
      await page.locator('.game-colorclash .play-bot').click();
      await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
      await page.getByRole('button', { name: 'Añadir bot', exact: true }).click();
      await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
      const orderPanel = page.locator('.color-order-panel');
      await expect(orderPanel).toBeVisible();
      await expect(orderPanel).toContainText('Orden de juego');
      await expect(page.locator('.table-sidebar .color-player-order')).toHaveCount(0);
      await expect(page.locator('.color-table .color-order-panel')).toHaveCount(0);
      await expect(orderPanel).toHaveCSS('flex-direction', 'column');
      const orderPanelBox = await orderPanel.boundingBox();
      const tableCenterBox = await page.locator('.card-table-center').boundingBox();
      expect(orderPanelBox).not.toBeNull();
      expect(tableCenterBox).not.toBeNull();
      expect(orderPanelBox!.x).toBeLessThan(tableCenterBox!.x);
      const playerRows = await page
        .locator('.color-player-order > li')
        .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().y));
      expect(playerRows).toHaveLength(4);
      expect(playerRows).toEqual([...playerRows].sort((a, b) => a - b));
      await expect(page.locator('.color-order-arrow svg')).toHaveCount(4);
      await expect(page.locator('.color-order-arrow svg').last()).toHaveClass(/lucide-arrow-down/);
      await expect(page.locator('.color-player-order li strong')).toHaveText([
        ...(direction === 1
          ? ['Ana (tú)', 'Bot 2', 'Bot 3', 'Bot 1']
          : ['Ana (tú)', 'Bot 1', 'Bot 3', 'Bot 2']),
      ]);
      await expect(page.locator('.color-next-player')).toContainText(
        direction === 1 ? 'Siguiente: Bot 2' : 'Siguiente: Bot 1',
      );
      await expect(orderPanel).not.toContainText(/Sentido horario|Sentido antihorario/);
      await expect(page.locator('.color-opponents > div')).toHaveCount(3);
      await expect(page.locator('.color-opponents')).toBeVisible();
      await expect(page.locator('.color-opponents .mini-cards')).toHaveCount(3);
      await expect(page.locator('.color-opponents .mini-cards > span')).toHaveCount(9);
      const centralPlayers = await page.locator('.color-opponents strong').allTextContents();
      expect(centralPlayers.map((name) => name.trim()).sort()).toEqual(['Bot 1', 'Bot 2', 'Bot 3']);
      await expect(page.locator('.color-opponents small')).toHaveText([
        '7 cartas',
        '7 cartas',
        '7 cartas',
      ]);
      await expect(page.locator('.color-penalty')).toContainText('+10 pendientes');
      await expect(
        page.getByRole('button', { name: 'Robar 10 cartas y perder el turno', exact: true }),
      ).toBeEnabled();
      await expect(page.locator('.draw-deck')).toHaveClass(/draw-available.*draw-penalty/);
      await expect(page.getByRole('button', { name: 'Jugar Azul +2', exact: true })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Jugar Rojo 3', exact: true })).toBeDisabled();
      await expect(
        page.getByRole('button', { name: 'Jugar Comodín Color', exact: true }),
      ).toBeDisabled();
      const hand = page.locator('.your-hand');
      await page.getByRole('button', { name: 'Jugar Comodín +4', exact: true }).click();
      await expect(page.locator('.color-choice-panel')).toBeVisible();
      await expect(page.locator('.draw-deck')).not.toHaveClass(/draw-available/);
      await expect(page.locator('.color-choices button').first()).toBeFocused();
      const handYAfterScroll = (await hand.boundingBox())!.y;
      const scrollAfterScroll = await page.evaluate(() => window.scrollY);
      await expect(hand).toBeInViewport();
      const audit = await accessibilityAudit(page).analyze();
      expect(
        audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Jugar Comodín +4', exact: true }),
      ).toBeFocused();
      // Restoring focus may scroll a few pixels on mobile to keep the card visible.
      expect(Math.abs((await hand.boundingBox())!.y - handYAfterScroll)).toBeLessThanOrEqual(16);
      expect(
        Math.abs((await page.evaluate(() => window.scrollY)) - scrollAfterScroll),
      ).toBeLessThanOrEqual(16);
      if (direction === 1 && viewport.width === 390) {
        await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Ampliar el juego', exact: true })
          .click();
        await page.getByRole('button', { name: 'Jugar Comodín +4', exact: true }).click();
        await expect(page.locator('.color-choice-panel')).toBeVisible();
        await expect(page.locator('.draw-deck')).not.toHaveClass(/draw-available/);
        await page.keyboard.press('Escape');
        await expect(page.locator('.color-choice-panel')).toHaveCount(0);
        await expect(page.locator('.game-page')).toHaveClass(/game-immersive/);
        await page.keyboard.press('Escape');
        await expect(page.locator('.game-page')).not.toHaveClass(/game-immersive/);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await page.screenshot({
        path: `tests/.output/screenshots/color-chain-${direction}-${viewport.width}.png`,
        fullPage: true,
      });
    });

test('Cambio de Color: un evento público emite sonido una vez sin reordenar la mano', async ({
  page,
}) => {
  type SoundWindow = Window & { colorAudio?: AudioContext; colorNotes: number };
  await page.addInitScript(() => {
    const Audio = window.AudioContext;
    (window as SoundWindow).colorNotes = 0;
    window.AudioContext = class extends Audio {
      constructor() {
        super();
        (window as SoundWindow).colorAudio = this;
      }
      createOscillator() {
        (window as SoundWindow).colorNotes++;
        return super.createOscillator();
      }
    };
  });
  let publish: (revision: number) => void = () => {
    throw new Error('Missing public state');
  };
  await page.routeWebSocket('**/socket.io/**', (route) => {
    const server = route.connectToServer();
    server.onMessage((message) => {
      if (typeof message === 'string' && message.startsWith('42')) {
        const packet = JSON.parse(message.slice(2));
        if (packet[0] === 'game:started' && packet[1].gameType === 'colorclash') {
          const state = packet[1].publicState;
          publish = (revision) =>
            route.send(
              '42' +
                JSON.stringify([
                  'game:state_update',
                  { ...state, actionNumber: revision, lastEvent: 'reverse', turnDirection: -1 },
                ]),
            );
        }
      }
      route.send(message);
    });
  });
  await ready(page);
  await page.locator('.game-colorclash .play-bot').click();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(page.locator('.color-table')).toBeVisible();
  const order = await page
    .locator('.hand-card')
    .evaluateAll((buttons) => buttons.map((b) => b.getAttribute('data-motion-id')));
  await expect
    .poll(() => page.evaluate(() => (window as SoundWindow).colorAudio?.currentTime || 0))
    .toBeGreaterThan(1.2);
  publish(1);
  await expect(page.locator('.color-order-panel')).not.toContainText(
    /Sentido horario|Sentido antihorario/,
  );
  await expect.poll(() => page.evaluate(() => (window as SoundWindow).colorNotes)).toBe(2);
  // Wait for the real native oscillators to finish before resending the same public event.
  await expect
    .poll(() => page.evaluate(() => (window as SoundWindow).colorAudio?.currentTime || 0))
    .toBeGreaterThan(1.8);
  publish(1);
  await page.getByRole('button', { name: 'Reglas', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => (window as SoundWindow).colorNotes)).toBe(2);
  expect(
    await page
      .locator('.hand-card')
      .evaluateAll((buttons) => buttons.map((b) => b.getAttribute('data-motion-id'))),
  ).toEqual(order);
});
