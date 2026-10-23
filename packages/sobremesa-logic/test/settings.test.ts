import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_SETTINGS,
  defaultGameSettings,
  validGameSetting,
  resolveGameSettings,
} from '../src/index.js';
test('Opciones: límites, tipos y claves válidos; sin cambios compartidos entre salas', () => {
  for (const [game, settings] of Object.entries(GAME_SETTINGS)) {
    const type = game as keyof typeof GAME_SETTINGS;
    for (const setting of settings!) {
      assert.ok(validGameSetting(type, setting.key, setting.defaultValue));
      for (const bad of [null, undefined, NaN, Infinity, -1, 'true', '30', {}, []])
        assert.equal(validGameSetting(type, setting.key, bad), false);
      assert.throws(() => resolveGameSettings(type, { [setting.key]: 'bad' }));
    }
    assert.equal(validGameSetting(type, 'foreign', true), false);
    const a = defaultGameSettings(type),
      b = defaultGameSettings(type);
    assert.notEqual(a, b);
  }
});
