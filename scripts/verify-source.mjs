import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const required = [
  'package.json', 'svelte.config.js', 'vite.config.ts', 'netlify.toml',
  'src/routes/+layout.svelte', 'src/routes/+page.svelte',
  'src/routes/marketplace/+page.svelte', 'src/routes/marketplace/[slug]/+page.svelte',
  'static/images/hero-city.webp', 'static/favicon.svg'
];

for (const file of required) {
  const info = await stat(join(root, file));
  if (!info.isFile() || info.size === 0) throw new Error(`Missing or empty: ${file}`);
}

JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

async function walk(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path));
    else output.push(path);
  }
  return output;
}

const files = await walk(join(root, 'src'));
const svelteFiles = files.filter((file) => file.endsWith('.svelte'));
if (svelteFiles.length < 20) throw new Error(`Expected at least 20 Svelte components/routes; found ${svelteFiles.length}`);

const missingAssets = new Set();
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/["'](\/images\/[^"']+)["']/g)) {
    const asset = join(root, 'static', match[1]);
    try { await stat(asset); } catch { missingAssets.add(match[1]); }
  }
  if (file.endsWith('.svelte')) {
    const opening = (source.match(/<script\b/g) ?? []).length;
    const closing = (source.match(/<\/script>/g) ?? []).length;
    if (opening !== closing) throw new Error(`Unbalanced script tags: ${relative(root, file)}`);
    const styleOpening = (source.match(/<style\b/g) ?? []).length;
    const styleClosing = (source.match(/<\/style>/g) ?? []).length;
    if (styleOpening !== styleClosing) throw new Error(`Unbalanced style tags: ${relative(root, file)}`);
  }
}

if (missingAssets.size) throw new Error(`Missing asset references:\n${[...missingAssets].join('\n')}`);
console.log(`Source verification passed: ${svelteFiles.length} Svelte files, all required routes and static assets present.`);
