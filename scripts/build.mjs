// Copies only the files the live site needs into dist/ (Netlify publishes dist/),
// plus the Netlify routing files. APKs, old PNG photos, old style.css/main.js stay out.
import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const INCLUDE = [
  'index.html', 'products.html', 'product.html', 'contact.html', 'livraison.html', 'confirm.html',
  'favicon_icon.png', 'logo1_nobg.png',
  'css', 'js', 'images/web'
];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const rel of INCLUDE) {
  const src = join(root, rel);
  if (!existsSync(src)) throw new Error(`Missing ${rel}`);
  cpSync(src, join(dist, rel), { recursive: true });
}

// Netlify routing (works for git builds and API deploys alike)
writeFileSync(join(dist, '_redirects'), [
  '/tshirts.html          /products.html               301',
  '/hoodies.html          /products.html               301',
  '/hoodies-oversize.html /products.html               301',
  '/zip-hoodies.html      /products.html               301',
  ''
].join('\n'));
writeFileSync(join(dist, '_headers'), [
  '/images/*',
  '  Cache-Control: public, max-age=604800',
  '/*',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  ''
].join('\n'));
console.log(`dist/ ready (${INCLUDE.length} entries + _redirects, _headers)`);
