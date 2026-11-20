/* Storage: Netlify Blobs (orders, devices). */
import { getStore } from "@netlify/blobs";

export function store(name) {
  const s = getStore({ name, consistency: "strong" });
  return {
    get: (key) => s.get(key, { type: "json" }),
    setJSON: (key, value) => s.setJSON(key, value),
    delete: (key) => s.delete(key),
    async keys() { const { blobs } = await s.list(); return blobs.map((b) => b.key); }
  };
}
