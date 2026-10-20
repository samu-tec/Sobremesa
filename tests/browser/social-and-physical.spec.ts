import { test, expect, type Page, type Browser } from '@playwright/test';
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
async function group(browser: Browser, page: Page, game: string) {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]),
    pages = [page, ...(await Promise.all(contexts.map((c) => c.newPage())))],
    names = ['Ana', 'Bruno', 'Clara'];
  for (let i = 0; i < 3; i++) {
    await pages[i].setViewportSize({ width: 320, height: 900 });
    await ready(pages[i], names[i]);
  }
  await page.locator(`.game-${game} .play-friends`).click();
  const code = (await page.locator('.room-code-text').innerText()).trim();
  for (const guest of pages.slice(1)) {
    await guest.getByRole('button', { name: 'Tengo un código', exact: true }).click();
    await guest.getByRole('textbox', { name: 'Código de la sala', exact: true }).fill(code);
    await guest.getByRole('button', { name: 'Unirme a la partida', exact: true }).click();
  }
  return { contexts, pages, names };
}
test('Dibuja: tres humanos en móvil, lienzo sincronizado, privacidad, reconexión y partida completa', async ({
  page,
  browser,
}) => {
  const { contexts, pages } = await group(browser, page, 'drawing');
  try {
    await expect(page.getByRole('button', { name: 'Añadir bot', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    for (let turn = 0; turn < 3; turn++) {
      const drawer = pages[turn];
      await expect(drawer.locator('.physical-impostor')).toHaveCount(0);
      await drawer.locator('.board-actions .button.primary').first().click();
      const word = (await drawer.locator('.drawing-secret').innerText()).replace(
        'Solo tú ves la palabra: ',
        '',
      );
      const guessers = pages.filter((_p, i) => i !== turn);
      for (const guest of guessers) {
        await expect(guest.locator('.drawing-secret')).toHaveCount(0);
        await expect(guest.getByText(word, { exact: true })).toHaveCount(0);
      }
      if (turn === 0) {
        await drawer.getByText('Dibujar mediante coordenadas y teclado', { exact: true }).click();
        await drawer.getByRole('button', { name: 'Añadir forma', exact: true }).click();
        await guessers[0].reload();
        await expect(guessers[0].locator('.drawing-canvas')).toBeVisible();
        await expect
          .poll(() =>
            guessers[0].locator('canvas').evaluate((node) =>
              Array.from(node.getContext('2d')!.getImageData(360, 225, 1, 1).data)
                .slice(0, 3)
                .some((n) => n < 200),
            ),
          )
          .toBe(true);
        await expect(page.getByRole('textbox', { name: 'Tu respuesta', exact: true })).toHaveCount(
          0,
        );
        expect((await accessibilityAudit(guessers[0]).analyze()).violations).toEqual([]);
      }
      for (const guest of guessers) {
        await guest.getByRole('textbox', { name: 'Tu respuesta', exact: true }).fill(word);
        await guest.getByRole('button', { name: 'Adivinar', exact: true }).click();
      }
      await expect(
        drawer.getByRole('button', { name: 'Siguiente dibujo', exact: true }),
      ).toBeVisible();
      await drawer.getByRole('button', { name: 'Siguiente dibujo', exact: true }).click();
    }
    for (const guest of pages) await expect(guest.getByRole('dialog')).toContainText('partida');
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
test('Impostor local: pantalla neutral, teclado, recuento físico, último intento y nueva ronda', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await ready(page);
  await page.locator('.game-impostor .game-title-row h3 button').click();
  await page.getByRole('button', { name: 'Presencial con un solo móvil', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Número de participantes', exact: true })
    .selectOption('3');
  await page.getByRole('combobox', { name: 'Vueltas de pistas', exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Comenzar ronda presencial', exact: true }).click();
  let impostor = -1;
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.local-secret')).toHaveCount(0);
    await page.getByRole('button', { name: 'Ver mi papel', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.local-secret')).toBeVisible();
    if (await page.getByText('Eres el impostor', { exact: true }).isVisible()) impostor = i;
    if (i === 0) {
      await page.getByRole('button', { name: 'Volver al catálogo', exact: true }).click();
      await expect(page.locator('.local-secret')).toHaveCount(0);
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(page.locator('.local-secret')).toHaveCount(0);
      await page.getByRole('button', { name: 'Ver mi papel', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Ocultar y pasar al siguiente', exact: true }).click();
    await expect(page.locator('.local-secret')).toHaveCount(0);
  }
  expect(impostor).toBeGreaterThanOrEqual(0);
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'He dado mi pista', exact: true }).click();
  await page.getByRole('spinbutton', { name: `Jugador ${impostor + 1}`, exact: true }).fill('3');
  await page.getByRole('button', { name: 'Registrar recuento físico', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('3');
  await page.getByRole('button', { name: 'Confirmar resultado', exact: true }).click();
  await page.getByRole('button', { name: 'No ha acertado', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar resultado', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Los inocentes descubrieron al impostor.', exact: true }),
  ).toBeVisible();
  expect((await accessibilityAudit(page).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Otra ronda', exact: true }).click();
  await expect(page.locator('.local-secret')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ver mi papel', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.game-card')).toHaveCount(30);
  await expect(page.locator('.local-secret')).toHaveCount(0);
});
test('Impostor presencial: tres móviles, papeles privados, pistas habladas y moderación del anfitrión', async ({
  page,
  browser,
}) => {
  const { contexts, pages, names } = await group(browser, page, 'impostor');
  try {
    await page
      .getByRole('combobox', { name: 'Modalidad de Impostor', exact: true })
      .selectOption('1');
    await page
      .getByRole('combobox', { name: 'Votación presencial', exact: true })
      .selectOption('1');
    await page.getByRole('combobox', { name: 'Vueltas de pistas', exact: true }).selectOption('1');
    await expect(page.getByRole('button', { name: 'Añadir bot', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
    let impostor = -1;
    for (let i = 0; i < 3; i++) {
      await pages[i].getByRole('button', { name: 'Ver mi papel', exact: true }).click();
      if (await pages[i].getByText('Eres el impostor', { exact: true }).isVisible()) impostor = i;
      await pages[i].getByRole('button', { name: 'Ocultar mi papel', exact: true }).click();
    }
    expect(impostor).toBeGreaterThanOrEqual(0);
    for (const participant of pages) {
      await expect(participant.getByRole('textbox', { name: 'Tu pista', exact: true })).toHaveCount(
        0,
      );
      await participant.getByRole('button', { name: 'He dado mi pista', exact: true }).click();
    }
    await page.reload();
    await expect(page.locator('.clue-card')).toHaveCount(3);
    await expect(
      pages[1].getByRole('button', { name: 'Registrar recuento físico', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('spinbutton', { name: names[impostor], exact: true }).fill('3');
    await page.getByRole('button', { name: 'Registrar recuento físico', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar resultado', exact: true }).click();
    await expect(pages[1].getByRole('button', { name: 'Ha acertado', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'No ha acertado', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar resultado', exact: true }).click();
    for (const participant of pages)
      await expect(participant.getByRole('dialog')).toContainText(
        'Los inocentes descubrieron al impostor.',
      );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
