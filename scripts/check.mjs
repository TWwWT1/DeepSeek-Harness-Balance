import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = args => execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit' });

run(['scripts/build.mjs']);
run(['--check', 'lib/client.js']);
const tests = (await readdir(new URL('../tests/', import.meta.url)))
  .filter(name => name.endsWith('.test.mjs'))
  .sort()
  .map(name => `tests/${name}`);
if (tests.length === 0) throw new Error('No test files found');
run(['--test', ...tests]);
