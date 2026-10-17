import {
  readFileSync,
  readdirSync,
  existsSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Include the installed runtime dependency tree, retaining upstream copyright text.
// Workspace code is not relicensed here. Re-run automatically with every client build.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seen = new Set();
const notices = new Map();
function packageFile(name, parent) {
  const require = createRequire(parent);
  let entry;
  try {
    entry = require.resolve(`${name}/package.json`);
  } catch {
    entry = require.resolve(name);
  }
  let directory = dirname(entry);
  while (directory !== dirname(directory)) {
    const candidate = join(directory, 'package.json');
    if (existsSync(candidate)) {
      const metadata = JSON.parse(readFileSync(candidate, 'utf8'));
      if (metadata.name === name && metadata.version) return candidate;
    }
    directory = dirname(directory);
  }
  throw new Error(`Cannot locate license metadata for ${name}`);
}
function visit(file) {
  file = realpathSync(file);
  if (seen.has(file)) return;
  seen.add(file);
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const local = pkg.name.startsWith('sobremesa');
  if (!local) {
    const directory = dirname(file);
    const files = readdirSync(directory).filter((name) =>
      /^(licen[cs]e|copying|notice)(\.|$)/i.test(name),
    );
    if (!files.length) throw new Error(`Missing upstream license text: ${pkg.name}@${pkg.version}`);
    const text = files
      .sort()
      .map((name) => readFileSync(join(directory, name), 'utf8').trim())
      .join('\n\n');
    const packages = notices.get(text) ?? [];
    packages.push(`${pkg.name}@${pkg.version} (${pkg.license || 'see license below'})`);
    notices.set(text, packages);
  }
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    if (version.startsWith('workspace:')) continue;
    visit(packageFile(name, file));
  }
}
visit(join(root, 'apps/sobremesa-client/package.json'));
visit(join(root, 'packages/sobremesa-logic/package.json'));
const output = join(root, 'apps/sobremesa-client/public/third-party-notices.txt');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  'Sobremesa — third-party runtime software notices\nGenerated from installed packages; includes transitive dependencies.\n\n' +
    [...notices]
      .map(([text, packages]) => packages.sort().join('\n') + '\n\n' + text)
      .join('\n\n' + '='.repeat(72) + '\n\n') +
    '\n',
);
console.log(`Third-party notices: ${seen.size - 1} packages.`);
