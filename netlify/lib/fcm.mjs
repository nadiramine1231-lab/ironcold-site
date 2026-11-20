/* Firebase Cloud Messaging (HTTP v1) to the Android app "IRON COLD Commandes".
   Needs FIREBASE_SERVICE_ACCOUNT_JSON on Netlify:
   Firebase → Project settings → Service accounts → Generate new private key (paste the whole file).
   Plain fetch + node:crypto, no firebase-admin package. */
import crypto from "node:crypto";
import { store } from "./store.mjs";

let cached = null;                                   // OAuth token, reused while the function stays warm

function account() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const a = JSON.parse(raw);
    return a.client_email && a.private_key && a.project_id ? a : null;
  } catch {
    return null;
  }
}

export const fcmReady = () => Boolean(account());

/* Each phone is saved under a short hash of its token */
export const deviceKey = (token) => crypto.createHash("sha256").update(String(token)).digest("hex").slice(0, 32);

async function accessToken(a) {
  if (cached && cached.email === a.client_email && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const part = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = part({ alg: "RS256", typ: "JWT" }) + "." + part({
    iss: a.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  });
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(a.private_key.replace(/\\n/g, "\n"), "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + signature })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`google oauth ${r.status} ${d.error_description || d.error || ""}`.trim());
  cached = { token: d.access_token, email: a.client_email, exp: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
  return cached.token;
}

/* Sends one notification to every phone where the app is installed and logged in.
   The sound comes from the phone's notification channel (the app creates it with the order sound). */
export async function fcmAll({ title, body, data = {} }) {
  const a = account();
  if (!a) return { sent: 0, devices: 0, reason: "FIREBASE_SERVICE_ACCOUNT_JSON missing" };
  const devices = store("devices");
  const keys = await devices.keys();
  if (!keys.length) return { sent: 0, devices: 0 };

  const token = await accessToken(a);
  const strData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? "")]));
  let sent = 0;
  const errors = [];

  await Promise.all(keys.map(async (key) => {
    const dv = await devices.get(key);
    if (!dv || !dv.token) return;
    const message = {
      token: dv.token,
      notification: { title, body },
      data: strData,
      android: {
        priority: "HIGH",
        ttl: "86400s",
        notification: {
          channel_id: dv.channel || "commandes_v1",
          sound: "order_notification",
          notification_priority: "PRIORITY_MAX",
          visibility: "PUBLIC",
          default_vibrate_timings: false,
          vibrate_timings: ["0s", "0.3s", "0.15s", "0.3s"],
          ...(strData.ref ? { tag: strData.ref } : {})
        }
      }
    };
    try {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
        method: "POST",
        headers: { authorization: "Bearer " + token, "content-type": "application/json" },
        body: JSON.stringify({ message })
      });
      if (r.ok) { sent++; return; }
      const e = await r.json().catch(() => ({}));
      const detail = (e.error && Array.isArray(e.error.details) && e.error.details.find((x) => x.errorCode)) || {};
      const code = detail.errorCode || (e.error && e.error.status) || String(r.status);
      // App uninstalled or token replaced: forget this phone
      if (r.status === 404 || code === "UNREGISTERED") await devices.delete(key);
      else errors.push(code);
    } catch (err) {
      errors.push(String(err && err.message || err));
    }
  }));

  if (errors.length) console.error("fcm errors", errors);
  return { sent, devices: keys.length, ...(errors.length ? { errors } : {}) };
}
