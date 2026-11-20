import crypto from "node:crypto";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

/* Admin requests carry "Authorization: Bearer <ADMIN_PASSWORD>" */
export function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = crypto.createHash("sha256").update(got).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/* Moroccan mobile/landline: 05/06/07 + 8 digits, accepts +212 / 00212 and Arabic digits */
export function normPhone(v) {
  const d = String(v || "")
    .replace(/[٠-٩]/g, (x) => String(x.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (x) => String(x.charCodeAt(0) - 0x06F0))
    .replace(/[^\d]/g, "")
    .replace(/^00/, "");
  const m = d.match(/^(?:212|0)([5-7]\d{8})$/);
  return m ? "0" + m[1] : null;
}
