/* GET /media/<key>.webp and /media/<key>-sm.webp — photos uploaded from admin.html (Blobs store "media"). */
import { store } from "../lib/store.mjs";

export default async (req) => {
  const file = decodeURIComponent(new URL(req.url).pathname.split("/").pop() || "");
  const m = file.match(/^([a-z0-9]{6,40}(?:-sm)?)\.webp$/);
  if (!m) return new Response("not found", { status: 404 });
  const hit = await store("media").getBinary(m[1]);
  if (!hit) return new Response("not found", { status: 404 });
  return new Response(hit.data, {
    headers: {
      "content-type": hit.type || "image/webp",
      // keys are random and never reused, so the file never changes
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
};

export const config = { path: "/media/*" };
