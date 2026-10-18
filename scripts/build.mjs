import { readFile, writeFile, mkdir } from 'node:fs/promises';

await mkdir(new URL('../lib/', import.meta.url), { recursive: true });
const model = await readFile(new URL('../src/model.js', import.meta.url), 'utf8');
const client = await readFile(new URL('../src/client.js', import.meta.url), 'utf8');
const host = await readFile(new URL('../src/host.js', import.meta.url), 'utf8');
const pricing = await readFile(new URL('../src/pricing.js', import.meta.url), 'utf8');
for (const name of ['pricing','accounting','store']) await writeFile(new URL(`../lib/${name}.js`, import.meta.url), await readFile(new URL(`../src/${name}.js`, import.meta.url),'utf8'));
await writeFile(new URL('../lib/model.js', import.meta.url), model);
await writeFile(new URL('../lib/index.js', import.meta.url), host);
const bundle = `window.__ModuleLoader__.load({ id: 'dsh-balance-card-local', factory: (require) => {\n${model.replaceAll('export function ', 'function ')}\n${pricing.replaceAll('export function ', 'function ')}\n${client}\nreturn { inject, apply };\n} });\n`;
await writeFile(new URL('../lib/client.js', import.meta.url), bundle);
console.log('Built host and browser plugin; no dependencies downloaded.');
