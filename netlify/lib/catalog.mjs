/* The editable shop content (admin.html → /api/admin/catalog), stored in Blobs store "site", key "catalog".
   Until the admin saves once, the defaults come from js/products.js in the repo. */
import "../../js/products.js";
import { store } from "./store.mjs";

export const DEFAULT_SETTINGS = {
  announcements: ["Livraison gratuite partout au Maroc", "Paiement à la livraison", "Nouveau drop — Zip Hoodies", "Échange de taille 7 jours"],
  whatsapp: "212606685735",
  email: "contact@ironcold.ma",
  instagram: "ironcold_officiel",
  texts: {},     // text overrides from the visual editor: { key: "new text" }
  images: {},    // image overrides: { "img:<original src>": "m/<media key>" }
  hidden: []     // hidden sections: ["index:sec:bands", …]
};

const defaults = () => ({
  products: JSON.parse(JSON.stringify(globalThis.IC_PRODUCTS || [])),
  categories: JSON.parse(JSON.stringify(globalThis.IC_CATEGORIES || [])),
  settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
  updatedAt: null
});

export async function getCatalog() {
  try {
    const saved = await store("site").get("catalog");
    if (saved && Array.isArray(saved.products)) {
      const d = defaults();
      return {
        products: saved.products,
        categories: Array.isArray(saved.categories) && saved.categories.length ? saved.categories : d.categories,
        settings: { ...d.settings, ...(saved.settings || {}) },
        updatedAt: saved.updatedAt || null
      };
    }
  } catch (e) {
    console.error("catalog read failed, using defaults", e);
  }
  return defaults();
}

/* ---------- validation (the admin is trusted, but keep the data clean and bounded) ---------- */
const str = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const slug = (v) => str(v, 80).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const imgName = (v) => {
  const s = str(v, 120);
  return /^m\/[a-z0-9]{6,40}$/.test(s) || /^[a-z0-9][a-z0-9-]{0,100}$/i.test(s) ? s : null;
};
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "TU"];

export function cleanCatalog(input) {
  const cats = (Array.isArray(input.categories) ? input.categories : []).slice(0, 20).map((c) => ({
    id: slug(c.id) || slug(c.label),
    label: str(c.label, 60),
    short: str(c.short || c.label, 30),
    tagline: str(c.tagline, 140),
    cover: imgName(c.cover) || ""
  })).filter((c) => c.id && c.label);
  const catIds = new Set(cats.map((c) => c.id));
  const seen = new Set();
  const products = (Array.isArray(input.products) ? input.products : []).slice(0, 300).map((p) => {
    let id = slug(p.id) || slug(p.name);
    while (seen.has(id)) id += "-2";
    seen.add(id);
    const price = Math.max(0, Math.min(100000, Math.round(Number(p.price) || 0)));
    const oldPrice = Math.round(Number(p.oldPrice) || 0);
    return {
      id,
      cat: catIds.has(p.cat) ? p.cat : (cats[0] && cats[0].id) || "",
      name: str(p.name, 100),
      gender: p.gender === "femme" ? "femme" : p.gender === "mixte" ? "mixte" : "homme",
      color: str(p.color, 40),
      price,
      ...(oldPrice > price ? { oldPrice: Math.min(100000, oldPrice) } : {}),
      badge: str(p.badge, 24),
      images: (Array.isArray(p.images) ? p.images : []).map(imgName).filter(Boolean).slice(0, 12),
      sizes: (Array.isArray(p.sizes) ? p.sizes : []).map((s) => str(s, 6).toUpperCase()).filter((s) => SIZES.includes(s)),
      desc: str(p.desc, 1500),
      ...(p.hidden ? { hidden: true } : {})
    };
  }).filter((p) => p.id && p.name && p.images.length && p.sizes.length);

  const s = input.settings || {};
  const texts = {};
  Object.entries(s.texts || {}).slice(0, 2000).forEach(([k, v]) => { if (/^[a-z0-9:._-]{1,80}$/i.test(k)) texts[k] = str(v, 600); });
  const images = {};
  Object.entries(s.images || {}).slice(0, 300).forEach(([k, v]) => { const n = imgName(v); if (k.startsWith("img:") && k.length < 200 && n) images[k] = n; });
  const settings = {
    announcements: (Array.isArray(s.announcements) ? s.announcements : DEFAULT_SETTINGS.announcements).map((a) => str(a, 120)).filter(Boolean).slice(0, 12),
    whatsapp: str(s.whatsapp, 20).replace(/\D/g, "") || DEFAULT_SETTINGS.whatsapp,
    email: str(s.email, 120) || DEFAULT_SETTINGS.email,
    instagram: str(s.instagram, 60).replace(/^@/, "") || DEFAULT_SETTINGS.instagram,
    texts,
    images,
    hidden: (Array.isArray(s.hidden) ? s.hidden : []).map((h) => str(h, 100)).filter(Boolean).slice(0, 100)
  };
  return { products, categories: cats, settings };
}

export async function saveCatalog(input) {
  const clean = cleanCatalog(input);
  if (!clean.products.length) throw new Error("Au moins un produit (avec photo et tailles) est nécessaire.");
  clean.updatedAt = new Date().toISOString();
  await store("site").setJSON("catalog", clean);
  return clean;
}

/* Products a customer can order (hidden ones excluded). */
export async function orderableProducts() {
  return (await getCatalog()).products.filter((p) => !p.hidden);
}
