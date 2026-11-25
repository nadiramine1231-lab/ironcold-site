/* Storage: Netlify Blobs on Netlify; plain files in IC_LOCAL_DIR when testing locally (scripts/dev.mjs). */
import fs from "node:fs/promises";
import path from "node:path";

function fileStore(name) {
  const dir = path.join(process.env.IC_LOCAL_DIR, name);
  const file = (key) => path.join(dir, encodeURIComponent(key));
  return {
    async get(key) { try { return JSON.parse(await fs.readFile(file(key) + ".json", "utf8")); } catch { return null; } },
    async setJSON(key, value) { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(file(key) + ".json", JSON.stringify(value)); },
    async getBinary(key) {
      try {
        const data = await fs.readFile(file(key) + ".bin");
        const meta = JSON.parse(await fs.readFile(file(key) + ".meta", "utf8").catch(() => "{}"));
        return { data, type: meta.type || "application/octet-stream" };
      } catch { return null; }
    },
    async setBinary(key, buf, type) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(key) + ".bin", buf);
      await fs.writeFile(file(key) + ".meta", JSON.stringify({ type }));
    },
    async delete(key) { for (const ext of [".json", ".bin", ".meta"]) await fs.rm(file(key) + ext, { force: true }); },
    async keys() {
      try {
        const set = new Set((await fs.readdir(dir)).map((f) => decodeURIComponent(f.replace(/\.(json|bin|meta)$/, ""))));
        return [...set];
      } catch { return []; }
    }
  };
}

async function blobStore(name) {
  const { getStore } = await import("@netlify/blobs");
  const s = getStore({ name, consistency: "strong" });
  return {
    get: (key) => s.get(key, { type: "json" }),
    setJSON: (key, value) => s.setJSON(key, value),
    async getBinary(key) {
      const r = await s.getWithMetadata(key, { type: "arrayBuffer" });
      return r ? { data: Buffer.from(r.data), type: (r.metadata && r.metadata.type) || "application/octet-stream" } : null;
    },
    setBinary: (key, buf, type) => s.set(key, buf, { metadata: { type } }),
    delete: (key) => s.delete(key),
    async keys() { const { blobs } = await s.list(); return blobs.map((b) => b.key); }
  };
}

/* Same API everywhere; the Blobs client is created lazily. */
export function store(name) {
  if (process.env.IC_LOCAL_DIR) return fileStore(name);
  let p;
  const s = () => (p = p || blobStore(name));
  return {
    get: async (k) => (await s()).get(k),
    setJSON: async (k, v) => (await s()).setJSON(k, v),
    getBinary: async (k) => (await s()).getBinary(k),
    setBinary: async (k, b, t) => (await s()).setBinary(k, b, t),
    delete: async (k) => (await s()).delete(k),
    keys: async () => (await s()).keys()
  };
}
