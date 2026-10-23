import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { en } from '../apps/sobremesa-client/src/i18n/en.ts';
import {
  GAME_CATALOG,
  GAME_SETTINGS,
  BOARD_TILES,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
} from '../packages/sobremesa-logic/src/index.ts';
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(`${directory}/${entry.name}`)
      : /\.tsx?$/.test(entry.name)
        ? [`${directory}/${entry.name}`]
        : [],
  );
}
function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}
function translated(key) {
  assert.ok(Object.hasOwn(en, key), `Falta traducción: ${key}`);
  assert.deepEqual(placeholders(en[key]), placeholders(key), `Parámetros diferentes: ${key}`);
}
test('Los textos de interfaz y los mensajes de los motores tienen traducción y los mismos parámetros', () => {
  for (const file of [
    ...files('apps/sobremesa-client/src'),
    ...files('packages/sobremesa-logic/src/games'),
  ]) {
    if (file.endsWith('/en.ts')) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    function key(node) {
      if (ts.isStringLiteral(node)) translated(node.text);
      if (ts.isConditionalExpression(node)) {
        key(node.whenTrue);
        key(node.whenFalse);
      }
    }
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ['t', 'msg'].includes(node.expression.getText(source)) &&
        node.arguments[0]
      )
        key(node.arguments[0]);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});
test('Los avisos de desconexión se traducen sin prometer una reserva garantizada', () => {
  assert.equal(
    en['{0} ha perdido la conexión. Puede volver mientras su plaza siga disponible.'],
    '{0} has lost the connection. They can return while their seat is still available.',
  );
  assert.equal(
    en[
      'Han perdido la conexión: {0}. Cada persona puede volver mientras su plaza siga disponible.'
    ],
    'The following players have lost connection: {0}. Each can return while their seat remains available.',
  );
  assert.equal(
    en['Reconectando… El plazo de recuperación de la sala de espera es de {0} segundos.'],
    'Reconnecting… The waiting room recovery period is {0} seconds.',
  );
  assert.equal(
    en['Reconectando… La disponibilidad de tu plaza depende del estado de la sala.'],
    'Reconnecting… Your seat’s availability depends on the room state.',
  );
});
test('Catálogo, reglas, consejos, cartas y casillas especiales están traducidos', () => {
  for (const game of GAME_CATALOG) {
    if (game.name !== 'Reversi') translated(game.name);
    for (const text of [game.category, game.description, game.tip, ...game.rules]) translated(text);
  }
  for (const card of [...CHANCE_CARDS, ...COMMUNITY_CHEST_CARDS]) translated(card.text);
  for (const tile of BOARD_TILES.filter((t) => t.type !== 'property')) translated(tile.name);
});

test('Las opciones de la sala y sus explicaciones tienen traducción', () => {
  for (const settings of Object.values(GAME_SETTINGS))
    for (const setting of settings) {
      translated(setting.label);
      translated(setting.description);
      if (setting.unit) translated(setting.unit);
      for (const label of setting.labels || []) translated(label);
    }
});
