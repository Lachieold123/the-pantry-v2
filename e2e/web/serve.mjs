// Serves the web build (`npm run export:web` → dist/) for the journey tests,
// sending every unknown path to index.html so deep links like /recipe/x work.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(process.env.E2E_DIST ?? 'dist');
const port = Number(process.env.E2E_PORT ?? 8790);
const types = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`No web build at ${root}. Run "npm run export:web" first.`);
  process.exit(1);
}
http
  .createServer((req, res) => {
    let file = path.join(root, decodeURIComponent((req.url ?? '/').split('?')[0]));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
