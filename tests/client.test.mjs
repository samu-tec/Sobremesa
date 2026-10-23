import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { requestOnConnection } from '../apps/sobremesa-client/src/services/request.ts';

const messages = { offline: 'offline', timeout: 'timeout' };
function connection() {
  return Object.assign(new EventEmitter(), { connected: true });
}
test('Un ACK de una conexión anterior no restaura una sala tras desconectar', async () => {
  const socket = connection();
  let acknowledge;
  const pending = requestOnConnection(
    socket,
    (done) => {
      acknowledge = done;
    },
    messages,
  );
  const rejected = assert.rejects(pending, /offline/);
  socket.connected = false;
  socket.emit('disconnect');
  socket.connected = true;
  acknowledge({ room: 'OLD' });
  await rejected;
  assert.equal(socket.listenerCount('disconnect'), 0);
  assert.deepEqual(await requestOnConnection(socket, (done) => done({ room: 'NEW' }), messages), {
    room: 'NEW',
  });
  assert.equal(socket.listenerCount('disconnect'), 0);
});
test('Timeout, envío fallido y socket desconectado liberan los listeners y no envían de nuevo', async () => {
  const socket = connection();
  let acknowledge;
  await assert.rejects(
    requestOnConnection(
      socket,
      (done) => {
        acknowledge = done;
      },
      messages,
      5,
    ),
    /timeout/,
  );
  acknowledge('late');
  assert.equal(socket.listenerCount('disconnect'), 0);
  await assert.rejects(
    requestOnConnection(
      socket,
      () => {
        throw new Error('send failed');
      },
      messages,
    ),
    /send failed/,
  );
  assert.equal(socket.listenerCount('disconnect'), 0);
  socket.connected = false;
  await assert.rejects(
    requestOnConnection(socket, () => assert.fail('must not send'), messages),
    /offline/,
  );
});

test('Las notas de Misterio son de sesión, jugador, sala y partida; el almacenamiento bloqueado no impide jugar', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const saved = new Map();
  try {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key) => saved.get(key) ?? null,
        setItem: (key, value) => saved.set(key, value),
        removeItem: (key) => saved.delete(key),
      },
    });
    const notebook = await import('../apps/sobremesa-client/src/services/mysteryNotebook.ts');
    notebook.writeMysteryNotes('ana', 'ROOM1', 'match-a', [2, 2, -1, 18, 4]);
    assert.deepEqual(notebook.readMysteryNotes('ana', 'ROOM1', 'match-a'), [2, 4]);
    assert.deepEqual(notebook.readMysteryNotes('bruno', 'ROOM1', 'match-a'), []);
    assert.deepEqual(notebook.readMysteryNotes('ana', 'ROOM2', 'match-a'), []);
    assert.deepEqual(notebook.readMysteryNotes('ana', 'ROOM1', 'match-b'), []);
    notebook.clearMysteryNotes('ana', 'ROOM1', 'match-a');
    assert.deepEqual(notebook.readMysteryNotes('ana', 'ROOM1', 'match-a'), []);
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      },
    });
    assert.deepEqual(notebook.readMysteryNotes('ana', 'ROOM1', 'match-a'), []);
    assert.doesNotThrow(() => notebook.writeMysteryNotes('ana', 'ROOM1', 'match-a', [3]));
    assert.doesNotThrow(() => notebook.clearMysteryNotes('ana', 'ROOM1', 'match-a'));
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
  }
});

test('Audio opcional: preferencias, síntesis, ráfagas, pestaña oculta y limpieza', async () => {
  const saved = new Map();
  const original = Object.fromEntries(
    ['localStorage', 'document', 'AudioContext'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  let audio;
  class Audio {
    state = 'running';
    currentTime = 10;
    destination = {};
    tones = [];
    constructor() {
      audio = this;
    }
    createOscillator() {
      const tone = {
        frequency: {
          setValueAtTime: (frequency, time) => {
            tone.frequencyValue = frequency;
            tone.startAt = time;
          },
        },
        connect() {},
        disconnect() {},
        start(time) {
          tone.started = time;
        },
        stop(time) {
          tone.stopped = time;
        },
      };
      this.tones.push(tone);
      return tone;
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => saved.get(key) ?? null,
        setItem: (key, value) => saved.set(key, value),
      },
    });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Audio });
    const sound = await import('../apps/sobremesa-client/src/services/sound.ts');
    assert.deepEqual(sound.readSoundPreferences(), { enabled: true, volume: 0.25 });
    saved.set('sobremesa.sound', '{');
    assert.deepEqual(sound.readSoundPreferences(), { enabled: true, volume: 0.25 });
    saved.set('sobremesa.sound', '{"enabled":true,"volume":4}');
    assert.deepEqual(sound.readSoundPreferences(), { enabled: true, volume: 1 });
    sound.playSound('turn');
    assert.equal(audio, undefined, 'No crea contexto fuera de un gesto');
    sound.setSoundPreferences({ enabled: true, volume: 0.4 });
    sound.unlockSound();
    const dispose = sound.installSoundGestures();
    sound.playSound('turn');
    assert.deepEqual(
      audio.tones.map((tone) => tone.frequencyValue),
      [523, 659],
    );
    assert.ok(
      audio.tones.every(
        (tone) => tone.stopped > tone.started && tone.stopped - tone.started < 0.14,
      ),
    );
    sound.playSound('turn');
    assert.equal(audio.tones.length, 2, 'Limita ráfagas');
    audio.currentTime += 1;
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    assert.ok(
      audio.tones.every((tone) => tone.stopped === undefined),
      'Detiene las notas al ocultar',
    );
    sound.playSound('dice');
    assert.equal(audio.tones.length, 2);
    doc.visibilityState = 'visible';
    sound.playSound('dice');
    assert.equal(audio.tones.length, 5);
    sound.playSound('win');
    assert.equal(
      audio.tones.length,
      8,
      'El resultado tiene prioridad sobre el sonido de la jugada',
    );
    sound.setSoundPreferences({ enabled: false, volume: 0.4 });
    audio.currentTime += 1;
    sound.playSound('card');
    assert.equal(audio.tones.length, 8);
    assert.deepEqual(JSON.parse(saved.get('sobremesa.sound')), { enabled: false, volume: 0.4 });
    dispose();
    assert.equal(audio.state, 'closed');
    sound.setSoundPreferences({ enabled: true, volume: 0.4 });
    sound.unlockSound();
    sound.suppressRecoverySounds();
    sound.playSound('win');
    assert.equal(audio.tones.length, 0, 'No reproduce avisos al recuperar una sesión');
    sound.installSoundGestures()();
    assert.equal(sound.actionSound({ type: 'ROLL_DICE' }), 'dice');
    assert.equal(sound.actionSound({ type: 'DRAW_CARD' }), 'draw');
    assert.equal(sound.actionSound({ type: 'PLAY_CARD' }), 'card');
    assert.equal(sound.actionSound({ type: 'MOVE' }), 'move');
    assert.equal(sound.actionSound({ type: 'STROKE' }), null);
    assert.equal(sound.actionSound({ type: 'GUESS' }), null);
  } finally {
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
