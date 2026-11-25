/* POST /api/notify — orders (checkout) and contact messages from the site.
   Orders are saved (Netlify Blobs) for the app "IRON COLD Commandes", which gets a push notification
   with the order sound. (No Telegram any more.)
   Prices always come from the catalogue (admin.html / js/products.js), never from the browser. */
import crypto from "node:crypto";
import { store } from "../lib/store.mjs";
import { orderableProducts } from "../lib/catalog.mjs";
import { fcmAll } from "../lib/fcm.mjs";
import { json, normPhone } from "../lib/http.mjs";

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);

async function handleOrder(d) {
  const phone = normPhone(d.phone);
  if (!phone) return json({ ok: false, error: "phone" }, 400);
  const prenom = clean(d.prenom, 60), nom = clean(d.nom, 60), city = clean(d.ville, 60), address = clean(d.adresse, 200);
  if (!prenom || !nom || !city || !address) return json({ ok: false, error: "fields" }, 400);
  const PRODUCTS = await orderableProducts();
  const items = (Array.isArray(d.items) ? d.items : []).slice(0, 20).map((i) => {
    const p = PRODUCTS.find((x) => i && x.id === i.id);
    if (!p || !p.sizes.includes(i.size)) return null;
    const qty = Math.min(10, Math.max(1, parseInt(i.qty, 10) || 1));
    return { id: p.id, name: p.name, color: p.color, size: i.size, qty, price: p.price };
  }).filter(Boolean);
  if (!items.length) return json({ ok: false, error: "items" }, 400);

  const now = new Date();
  const id = now.getTime().toString(36) + Math.random().toString(36).slice(2, 6);
  const qty = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const order = {
    id, createdAt: now.toISOString(), status: "new",
    name: `${prenom} ${nom}`, prenom, nom, phone, city, address,
    items, qty, pack: { fr: `${qty} article${qty > 1 ? "s" : ""}` }, total, lang: "fr",
    confirmToken: crypto.randomBytes(12).toString("hex")   // customer self-confirmation link
  };
  await store("orders").setJSON(id, order);

  const lines = items.map((i) => `${i.name.replace(/^IRONCOLD\s+/, "")} ${i.color} (${i.size})${i.qty > 1 ? " ×" + i.qty : ""}`);

  // The order is saved even if a notification fails.
  await fcmAll({ title: `🛍️ Nouvelle commande · ${total} MAD`, body: `${order.name} · ${city}\n${lines.join(", ")}`, data: { type: "new_order", ref: id } })
    .catch((e) => console.error("push error", e));
  const ref = id.slice(-6).toUpperCase();
  return json({ ok: true, id, ref, total, confirmUrl: `/confirm.html?o=${id}&k=${order.confirmToken}` });
}

async function handleContact(d) {
  const prenom = clean(d.prenom, 60), nom = clean(d.nom, 60), email = clean(d.email, 120);
  const message = clean(d.message, 2000);
  if (!prenom || !nom || !message || !/^\S+@\S+\.\S+$/.test(email)) return json({ ok: false, error: "fields" }, 400);
  const r = await fcmAll({ title: "📩 Nouveau message", body: `${prenom} ${nom} · ${message.slice(0, 120)}`, data: { type: "contact" } }).catch(() => ({ sent: 0 }));
  const delivered = r.sent > 0;
  return delivered ? json({ ok: true }) : json({ ok: false, error: "not-delivered" }, 503);
}

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let d;
  try { d = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  if (!d || typeof d !== "object") return json({ ok: false, error: "json" }, 400);
  if (d.website) return json({ ok: true });                 // honeypot filled = bot
  if (d.type === "order") return handleOrder(d);
  if (d.type === "contact") return handleContact(d);
  return json({ ok: false, error: "type" }, 400);
};

export const config = { path: "/api/notify" };
