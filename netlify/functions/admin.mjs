/* /api/admin/* — used by the Android app "IRON COLD Commandes".
   Every request needs "Authorization: Bearer <ADMIN_PASSWORD>". */
import { store } from "../lib/store.mjs";
import { fcmAll, fcmReady, deviceKey } from "../lib/fcm.mjs";
import { json, isAdmin } from "../lib/http.mjs";

const STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"];

export default async (req) => {
  const route = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, "").replace(/\/$/, "");
  if (!process.env.ADMIN_PASSWORD) return json({ ok: false, error: "ADMIN_PASSWORD missing" }, 500);
  if (!isAdmin(req)) return json({ ok: false, error: "auth" }, 401);

  const orders = store("orders");

  if (route === "me" && req.method === "GET") return json({ ok: true, fcm: fcmReady(), telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN) });

  if (route === "devices" && req.method === "POST") {
    const { token, channel, name } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || token.length < 20 || token.length > 4096) return json({ ok: false, error: "token" }, 400);
    const ch = /^[a-z0-9_]{1,40}$/.test(String(channel || "")) ? String(channel) : "commandes_v1";
    await store("devices").setJSON(deviceKey(token), { token, channel: ch, name: String(name || "").slice(0, 80), savedAt: new Date().toISOString() });
    return json({ ok: true, fcm: fcmReady() });
  }

  if (route === "devices" && req.method === "DELETE") {
    const { token } = await req.json().catch(() => ({}));
    if (token) await store("devices").delete(deviceKey(token));
    return json({ ok: true });
  }

  if (route === "orders" && req.method === "GET") {
    const keys = await orders.keys();
    const list = (await Promise.all(keys.map((k) => orders.get(k)))).filter(Boolean);
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return json({ ok: true, orders: list });
  }

  if (route === "orders" && req.method === "PATCH") {
    const { id, status } = await req.json().catch(() => ({}));
    if (!STATUSES.includes(status)) return json({ ok: false, error: "status" }, 400);
    const o = id && (await orders.get(String(id)));
    if (!o) return json({ ok: false, error: "not-found" }, 404);
    o.status = status;
    o.updatedAt = new Date().toISOString();
    await orders.setJSON(o.id, o);
    return json({ ok: true, order: o });
  }

  if (route === "orders" && req.method === "DELETE") {
    const { id } = await req.json().catch(() => ({}));
    if (!id) return json({ ok: false, error: "id" }, 400);
    await orders.delete(String(id));
    return json({ ok: true });
  }

  if (route === "test" && req.method === "POST") {
    const app = await fcmAll({ title: "IRON COLD · Notification test", body: "Les notifications fonctionnent. Chaque commande arrivera ici.", data: { type: "test" } })
      .catch((e) => ({ sent: 0, error: String(e.message || e) }));
    return json({ ok: true, app });
  }

  return json({ ok: false, error: "not-found" }, 404);
};

export const config = { path: ["/api/admin", "/api/admin/*"] };
