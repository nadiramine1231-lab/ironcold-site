/* /api/confirm — the customer confirms (or cancels) their own order from the link
   /confirm.html?o=<order id>&k=<confirmToken>. The token is random per order, so only
   someone with the link can see or change it. The app gets a push notification. */
import crypto from "node:crypto";
import { store } from "../lib/store.mjs";
import { fcmAll } from "../lib/fcm.mjs";
import { json } from "../lib/http.mjs";

const same = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

// What the customer sees: no phone number, no full address.
const publicView = (o) => ({
  ref: o.id.slice(-6).toUpperCase(),
  prenom: o.prenom || String(o.name || "").split(" ")[0],
  city: o.city,
  items: (o.items || []).map((i) => ({ name: i.name, color: i.color, size: i.size, qty: i.qty, price: i.price })),
  total: o.total,
  status: o.status,
  confirmedBy: o.confirmedBy || null,
  createdAt: o.createdAt
});

export default async (req) => {
  const url = new URL(req.url);
  let o = url.searchParams.get("o"), k = url.searchParams.get("k"), action = null;
  if (req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    o = b.o; k = b.k; action = b.action;
  } else if (req.method !== "GET") return json({ ok: false, error: "method" }, 405);

  if (!o || !k || String(o).length > 40 || String(k).length > 64) return json({ ok: false, error: "link" }, 400);
  const orders = store("orders");
  const order = await orders.get(String(o));
  if (!order || !order.confirmToken || !same(order.confirmToken, k)) return json({ ok: false, error: "not-found" }, 404);

  if (req.method === "GET") return json({ ok: true, order: publicView(order) });

  if (!["confirm", "cancel"].includes(action)) return json({ ok: false, error: "action" }, 400);
  // Once the shop has moved the order on (shipped, delivered…), the customer can't change it any more.
  if (!["new", "confirmed"].includes(order.status)) return json({ ok: true, order: publicView(order), locked: true });

  const ref = order.id.slice(-6).toUpperCase();
  const now = new Date().toISOString();
  if (action === "confirm" && order.status !== "confirmed") {
    order.status = "confirmed";
    order.confirmedBy = "client";
    order.confirmedAt = now;
  } else if (action === "cancel") {
    order.status = "cancelled";
    order.cancelledBy = "client";
    order.cancelledAt = now;
  } else {
    return json({ ok: true, order: publicView(order) });       // already confirmed
  }
  order.updatedAt = now;
  await orders.setJSON(order.id, order);

  const title = action === "confirm" ? `✅ Confirmée par le client · ${order.total} MAD` : `❌ Annulée par le client · N° ${ref}`;
  await fcmAll({ title, body: `${order.name} · ${order.city} · N° ${ref}`, data: { type: action === "confirm" ? "client_confirmed" : "client_cancelled", ref: order.id } })
    .catch((e) => console.error("push error", e));

  return json({ ok: true, order: publicView(order) });
};

export const config = { path: "/api/confirm" };
