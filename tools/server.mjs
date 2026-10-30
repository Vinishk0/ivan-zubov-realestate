import reviews from '../api/reviews.mjs';
import callback from '../api/vk-callback.mjs';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import leads from '../api/leads.mjs';
import { existsSync } from 'node:fs';

const localEnv = resolve(dirname(fileURLToPath(import.meta.url)), '../.env.local');
if (existsSync(localEnv)) process.loadEnvFile(localEnv);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.geojson': 'application/geo+json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const allowed = new Set(['/index.html', '/styles.css', '/portrait-color.css', '/app.mjs', '/motion.mjs', '/motion.css', '/content.mjs', '/okrugs.mjs', '/map.mjs', '/favicon.svg']);

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (path === '/api/reviews') { await reviews(req,res); return; }
      if (path === '/api/vk-callback') { await callback(req,res); return; }
      if (path === '/api/leads') { await leads(req, res); return; }
      const publicPath = path === '/' ? '/index.html' : path;
      const filename = resolve(root, `.${publicPath}`);
      if ((!allowed.has(publicPath) && !publicPath.startsWith('/assets/')) || !filename.startsWith(root + sep) || publicPath.includes('..')) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const info = await stat(filename);
      if (!info.isFile()) { res.writeHead(404); res.end('Not found'); return; }
      const data = await readFile(filename);
      const headers = { 'Content-Type': mime[extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
      if (req.headers.range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
        const start = Number(match?.[1]);
        const end = match?.[2] ? Number(match[2]) : data.length - 1;
        if (!match || start > end || end >= data.length) { res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); res.end(); return; }
        res.writeHead(206, {...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1});
        res.end(req.method === 'HEAD' ? undefined : data.subarray(start, end + 1)); return;
      }
      res.writeHead(200, {...headers, 'Content-Length': data.length});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createServer().listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
}
