// Local test server with the Netlify functions: node scripts/dev.mjs [port]
// Data goes to .data/ (not in git). Admin password: local-test (or ADMIN_PASSWORD env).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = +process.argv[2] || 5512;
process.env.IC_LOCAL_DIR = process.env.IC_LOCAL_DIR || path.join(root, ".data");
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "local-test";

const fn = (name) => import(pathToFileURL(path.join(root, "netlify", "functions", name)).href).then((m) => m.default);
const ROUTES = [
  [/^\/api\/notify$/, "notify.mjs"],
  [/^\/api\/confirm$/, "confirm.mjs"],
  [/^\/api\/admin(\/.*)?$/, "admin.mjs"],
  [/^\/js\/products\.js$/, "catalog-js.mjs"],
  [/^\/media\//, "media.mjs"]
];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const route = ROUTES.find(([re]) => re.test(url.pathname));
  if (route) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    try {
      const handler = await fn(route[1]);
      const r = await handler(new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }), {});
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      console.error(e);
      res.writeHead(500); res.end(String(e));
    }
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
}).listen(port, () => console.log(`IRONCOLD dev on http://localhost:${port} (admin password: ${process.env.ADMIN_PASSWORD})`));
