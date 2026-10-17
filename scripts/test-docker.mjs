import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

// No Compose, mounts, external networks or remote Docker contexts.
const name = `sobremesa-local-test-${process.pid}`;
const image = `sobremesa:local-test-${process.pid}`;
const baseURL = 'http://127.0.0.1:13000';
let container;
let built = false;
async function run(command, args, capture = false, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
      env,
    });
    let output = '';
    child.stdout?.on('data', (chunk) => (output += chunk));
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(new Error(`${command} terminó con código ${code}`)),
    );
  });
}
const docker = (...args) => run('docker', args, true);
async function cleanup() {
  if (container) {
    const id = container;
    container = undefined;
    await docker('stop', '--time', '10', id);
    const stopped = JSON.parse(await docker('inspect', id))[0];
    assert.equal(stopped.State.ExitCode, 0, 'Apagado limpio con SIGTERM');
    await docker('rm', id);
    console.log(`Contenedor temporal eliminado: ${name}`);
  }
  if (built) {
    built = false;
    await docker('image', 'rm', image);
    console.log(`Etiqueta temporal eliminada: ${image}`);
  }
}
try {
  assert.ok(
    !process.env.DOCKER_HOST || process.env.DOCKER_HOST.startsWith('unix://'),
    'Solo Docker local mediante socket Unix',
  );
  const context = JSON.parse(await docker('context', 'inspect'))[0];
  assert.match(
    context.Endpoints.docker.Host,
    /^unix:\/\//,
    'No se permite un contexto Docker remoto',
  );
  await run('docker', ['build', '-t', image, '.']);
  built = true;
  container = await docker(
    'run',
    '--detach',
    '--name',
    name,
    '--label',
    'sobremesa.test=local-test',
    '--publish',
    '127.0.0.1:13000:3000',
    '--init',
    '--read-only',
    '--tmpfs',
    '/tmp:size=16m,mode=1777',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges:true',
    '--memory',
    '512m',
    '--cpus',
    '1',
    '--pids-limit',
    '128',
    '--env',
    'ALLOWED_ORIGINS=http://127.0.0.1:13000,http://localhost:13000',
    '--env',
    'BOT_THINKING_TIME_MS=60',
    '--env',
    'ROOM_CREATE_LIMIT_PER_IP=100',
    '--env',
    'ROOM_CREATE_LIMIT_GLOBAL=500',
    image,
  );
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      ready = (await fetch(`${baseURL}/health`)).ok;
    } catch {
      /* Startup. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'El contenedor debe arrancar');
  assert.notEqual(await docker('exec', container, 'id', '-u'), '0');
  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseURL,
    PLAYWRIGHT_BROWSER: process.env.PLAYWRIGHT_BROWSER || 'chromium',
  };
  await run(process.execPath, ['tests/docker-smoke.mjs'], false, env);
  await run('pnpm', ['test:e2e'], false, env);
  const info = JSON.parse(await docker('inspect', container))[0];
  assert.equal(info.State.Health.Status, 'healthy');
  assert.equal(info.HostConfig.ReadonlyRootfs, true);
  assert.equal(info.HostConfig.Memory, 512 * 1024 * 1024);
  assert.equal(info.HostConfig.NanoCpus, 1_000_000_000);
  assert.equal(info.HostConfig.PidsLimit, 128);
  console.log('Healthcheck, usuario, filesystem y restricciones de recursos: OK');
} catch (error) {
  if (container) console.error(await docker('logs', container).catch(() => 'Sin logs'));
  console.error(error);
  process.exitCode = 1;
} finally {
  await cleanup();
}
