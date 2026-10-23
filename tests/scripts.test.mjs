import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// El proceso aislado simula comandos y healthcheck: nunca contacta con Docker ni HTTP.
const preload = `
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { appendFileSync } from 'node:fs';
const scenario = process.env.SOBREMESA_TEST_SCENARIO;
let previous;
globalThis.fetch = async () => ({ ok: scenario !== 'health-failure' });
const timeout = globalThis.setTimeout;
globalThis.setTimeout = (callback) => timeout(callback, 0);
childProcess.spawn = (command, args) => {
  appendFileSync(process.env.SOBREMESA_TEST_COMMANDS, JSON.stringify({ command, args }) + '\\n');
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  let output = '', code = 0;
  if (command === 'docker') {
    if (args[0] === 'context') output = JSON.stringify([{ Endpoints: { docker: { Host: 'unix:///local-test.sock' } } }]);
    if (['create', 'run'].includes(args[0])) output = 'owned-container-id';
    if (args[0] === 'exec') output = '1000';
    if (args[0] === 'inspect') {
      output = JSON.stringify([{
        State: { ExitCode: scenario.includes('dirty-exit') ? 9 : 0, Health: { Status: scenario === 'unhealthy' ? 'unhealthy' : 'healthy' } },
        HostConfig: { ReadonlyRootfs: true, Memory: 512 * 1024 * 1024, NanoCpus: 1000000000, PidsLimit: 128 }
      }]);
      if (scenario === 'inspect-failure' && previous === 'stop') code = 21;
    }
    if (scenario === 'stop-failure' && args[0] === 'stop') code = 23;
    if (scenario === 'remove-failure' && args[0] === 'rm') code = 25;
    if (scenario === 'start-failure' && args[0] === 'start') code = 27;
    previous = args[0];
  } else if (command === process.execPath && scenario === 'tests-and-dirty-exit') code = 17;
  queueMicrotask(() => { child.stdout.emit('data', output); child.emit('close', code); });
  return child;
};
syncBuiltinESMExports();
`;

for (const scenario of [
  'success',
  'dirty-exit',
  'tests-and-dirty-exit',
  'health-failure',
  'unhealthy',
  'inspect-failure',
  'stop-failure',
  'remove-failure',
  'start-failure',
]) {
  test(`Docker local: limpieza y error original en ${scenario}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'sobremesa-script-test-'));
    try {
      const hook = join(directory, 'preload.mjs');
      const commands = join(directory, 'commands.jsonl');
      await writeFile(hook, preload);
      const child = spawn(process.execPath, ['--import', hook, 'scripts/test-docker.mjs'], {
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        env: {
          ...process.env,
          DOCKER_HOST: 'unix:///local-test.sock',
          SOBREMESA_TEST_SCENARIO: scenario,
          SOBREMESA_TEST_COMMANDS: commands,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let errors = '';
      child.stdout.resume();
      child.stderr.on('data', (chunk) => (errors += chunk));
      const code = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      });
      assert.equal(code, scenario === 'success' ? 0 : 1, errors);
      const calls = (await readFile(commands, 'utf8')).trim().split('\n').map(JSON.parse);
      const docker = calls.filter((call) => call.command === 'docker').map((call) => call.args);
      assert.ok(docker.some((args) => args[0] === 'stop' && args.at(-1) === 'owned-container-id'));
      assert.ok(docker.some((args) => args[0] === 'rm' && args.at(-1) === 'owned-container-id'));
      const build = docker.find((args) => args[0] === 'build');
      assert.ok(
        docker.some((args) => args[0] === 'image' && args[1] === 'rm' && args[2] === build[2]),
      );
      assert.ok(!docker.some((args) => args.includes('prune')));
      if (scenario === 'tests-and-dirty-exit') {
        assert.match(errors, /terminó con código 17/);
        assert.match(errors, /Apagado limpio con SIGTERM/);
      }
      if (scenario === 'health-failure') assert.match(errors, /El contenedor debe arrancar/);
      if (scenario === 'start-failure') assert.match(errors, /docker terminó con código 27/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}
