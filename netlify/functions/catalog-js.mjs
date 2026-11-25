/* GET /js/products.js — the live catalogue + site settings as a tiny script (loaded by every page).
   Replaces the static js/products.js once the admin has saved; falls back to it otherwise. */
import { getCatalog } from "../lib/catalog.mjs";

export default async () => {
  const c = await getCatalog();
  const g = "(typeof window !== 'undefined' ? window : globalThis)";
  const body =
    `${g}.IC_CATEGORIES = ${JSON.stringify(c.categories)};\n` +
    `${g}.IC_PRODUCTS = ${JSON.stringify(c.products.filter((p) => !p.hidden))};\n` +
    `${g}.IC_SETTINGS = ${JSON.stringify(c.settings)};\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
};

export const config = { path: "/js/products.js" };
