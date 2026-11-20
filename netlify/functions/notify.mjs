/* POST /api/notify — orders (checkout) and contact messages from the site.
   Orders are saved (Netlify Blobs) for the app "IRON COLD Commandes", which gets a push notification
   with the order sound. Telegram still gets a copy when TELEGRAM_BOT_TOKEN is set.
   Prices always come from js/products.js, never from the browser. */
import "../../js/products.js";
import { store } from "../lib/store.mjs";
import { fcmAll } from "../lib/fcm.mjs";
import { json, normPhone } from "../lib/http.mjs";

const PRODUCTS = globalThis.IC_PRODUCTS || [];
const DEFAULT_CHAT_ID = "8891194734";
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);

async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { skipped: true };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID, text })
  });
  if (!r.ok) throw new Error("telegram " + r.status);
  return { ok: true };
}

async function handleOrder(d) {
  const phone = normPhone(d.phone);
  if (!phone) return json({ ok: false, error: "phone" }, 400);
  const prenom = clean(d.prenom, 60), nom = clean(d.nom, 60), city = clean(d.ville, 60), address = clean(d.adresse, 200);
  if (!prenom || !nom || !city || !address) return json({ ok: false, error: "fields" }, 400);
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
    items, qty, pack: { fr: `${qty} article${qty > 1 ? "s" : ""}` }, total, lang: "fr"
  };
  await store("orders").setJSON(id, order);

  const lines = items.map((i) => `${i.name.replace(/^IRONCOLD\s+/, "")} ${i.color} (${i.size})${i.qty > 1 ? " ×" + i.qty : ""}`);
  const when = now.toLocaleString("fr-MA", { timeZone: "Africa/Casablanca", hour12: false });
  const tgText = `🛒 NOUVELLE COMMANDE — IRONCOLD\n\n👤 ${order.name}\n📞 ${phone}\n📍 ${city}, ${address}\n\n📦 Articles :\n${items.map((i) => `  • ${i.name} (${i.color}) — Taille ${i.size} × ${i.qty}   →   ${i.price * i.qty} MAD`).join("\n")}\n\n💰 Total : ${total} MAD\n\n🕐 ${when}`;

  // The order is saved even if a notification fails.
  const sent = await Promise.allSettled([
    fcmAll({ title: `🛍️ Nouvelle commande · ${total} MAD`, body: `${order.name} · ${city}\n${lines.join(", ")}`, data: { type: "new_order", ref: id } }),
    telegram(tgText)
  ]);
  sent.forEach((r) => { if (r.status === "rejected") console.error("notify error", r.reason); });
  return json({ ok: true, id, total });
}

async function handleContact(d) {
  const prenom = clean(d.prenom, 60), nom = clean(d.nom, 60), email = clean(d.email, 120);
  const message = clean(d.message, 2000);
  if (!prenom || !nom || !message || !/^\S+@\S+\.\S+$/.test(email)) return json({ ok: false, error: "fields" }, 400);
  const when = new Date().toLocaleString("fr-MA", { timeZone: "Africa/Casablanca", hour12: false });
  const text = `📩 NOUVEAU MESSAGE — IRONCOLD\n\n👤 ${prenom} ${nom}\n📧 ${email}\n📞 ${clean(d.phone, 24) || "—"}\n📌 Sujet : ${clean(d.sujet, 80) || "—"}\n\n💬 Message :\n${message}\n\n🕐 ${when}`;
  const results = await Promise.allSettled([
    telegram(text),
    fcmAll({ title: "📩 Nouveau message", body: `${prenom} ${nom} · ${message.slice(0, 120)}`, data: { type: "contact" } })
  ]);
  const delivered = results.some((r) => r.status === "fulfilled" && r.value && (r.value.ok || r.value.sent > 0));
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
