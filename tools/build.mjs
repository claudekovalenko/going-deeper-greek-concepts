// Build the single-file offline copy:
//
//   dist/greek-cases.html   the whole app in one file, no server needed
//
//   node tools/build.mjs
//
// The hosted app needs no build — index.html loads js/app.js directly, and one
// file means one cache key, so `?v=vN` invalidates the lot. This script exists
// only so the app can also be a thing you save and open, with no Pages, no
// network and no service worker involved.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const app = read('js/app.js');

// One place to bump the version: the source itself.
const match = app.match(/^const BUILD = '([^']+)';$/m);
if (!match) throw new Error("js/app.js must declare: const BUILD = '...';");
const VERSION = match[1].split(' ')[0];

/* ---------- the hosted page points at the versioned script ---------- */

const indexPath = resolve(ROOT, 'index.html');
let index = readFileSync(indexPath, 'utf8');
const before = index;
index = index.replace(
  /<script type="module" src="\.\/js\/app\.js(?:\?v=[^"]*)?"><\/script>/,
  `<script type="module" src="./js/app.js?v=${VERSION}"></script>`
);
if (index === before && !index.includes(`app.js?v=${VERSION}`)) {
  throw new Error('index.html has no recognisable app script tag to version');
}
writeFileSync(indexPath, index);

/* ---------- the offline single-file copy ---------- */

const concepts = JSON.parse(read('data/concepts.json'));
const iconSvg = read('icons/icon.svg');
const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;

// Every injection goes through a replacer FUNCTION, never a replacement
// string. A replacement string treats `$$`, `$&` and `` $` `` as directives —
// and app.js declares `$$` as its query-all helper, which a string replacement
// silently rewrote to `$`, redeclaring the other helper and killing the page.
const inject = (value) => () => value;

const single = index
  .replace(/<link rel="manifest"[^>]*>\s*/, '')
  .replace(/<link rel="icon"[^>]*>/, inject(`<link rel="icon" href="${iconDataUri}" type="image/svg+xml" />`))
  .replace(/<link rel="apple-touch-icon"[^>]*>/, inject(`<link rel="apple-touch-icon" href="${iconDataUri}" />`))
  .replace(/<link rel="stylesheet"[^>]*>/, inject(`<style>\n${read('css/styles.css')}\n</style>`))
  .replace(
    /<script type="module" src="\.\/js\/app\.js\?v=[^"]*"><\/script>/,
    inject(
      ['<script type="module">', `globalThis.__CONCEPTS__ = ${JSON.stringify(concepts)};`, app, '</script>'].join('\n')
    )
  )
  .replace('<title>Greek Cases — Mnemonics</title>', inject('<title>Greek Cases — Mnemonics (offline)</title>'));

mkdirSync(resolve(ROOT, 'dist'), { recursive: true });
writeFileSync(resolve(ROOT, 'dist/greek-cases.html'), single);

console.log(`build ${match[1]}`);
console.log(`  index.html            -> js/app.js?v=${VERSION}`);
console.log(`  dist/greek-cases.html ${(single.length / 1024).toFixed(0)} KB`);
