import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { en } from '../apps/client/src/i18n/en.ts';
import {
  GAME_CATALOG,
  BOARD_TILES,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
} from '../packages/game-logic/src/index.ts';
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
  for (const file of [...files('apps/client/src'), ...files('packages/game-logic/src/games')]) {
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
test('Catálogo, reglas, consejos, cartas y casillas especiales están traducidos', () => {
  for (const game of GAME_CATALOG) {
    if (game.name !== 'Reversi') translated(game.name);
    for (const text of [game.category, game.description, game.tip, ...game.rules]) translated(text);
  }
  for (const card of [...CHANCE_CARDS, ...COMMUNITY_CHEST_CARDS]) translated(card.text);
  for (const tile of BOARD_TILES.filter((t) => t.type !== 'property')) translated(tile.name);
});
