/**
 * StyleHub backend — a tiny local server with no external dependencies
 * of its own. It does two jobs:
 *   1. Auto-builds and serves the React app (dist/) — the admin panel
 *      is the same app, routed client-side at /admin.
 *   2. Provides a REST API (/api/products, /api/orders, /api/customers,
 *      /api/faqs, /api/policies, /api/settings) backed by data.json — a
 *      real file on disk, so changes made in the Admin panel persist and
 *      are visible on the storefront.
 *
 * Storage location:
 *   By default, data.json and uploads/ live next to this file (great for
 *   local development). On hosts with a persistent volume (e.g. Fly.io),
 *   set the DATA_DIR environment variable to the mounted volume path
 *   (e.g. /data) so your data survives redeploys and restarts. On first
 *   boot with an empty DATA_DIR, data.json is auto-seeded from the copy
 *   bundled with the code.
 *
 * Just run:      node server.js
 * The very first run builds the React frontend automatically (needs
 * Node/npm and an internet connection, and takes a minute or two).
 * Every run after that starts instantly, since the build already exists.
 * Then open:     http://localhost:3000        (storefront)
 *                http://localhost:3000/admin   (admin panel)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Where data.json and uploads/ actually live. Defaults to this folder
// (local dev). On Fly.io we set DATA_DIR=/data to point at the mounted
// persistent volume instead.
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DATA_FILE = path.join(DATA_DIR, 'data.json');
// A copy of the initial catalog bundled with the code, used only to seed
// a brand-new/empty DATA_DIR (e.g. a fresh Fly.io volume) on first boot.
const SEED_FILE = path.join(__dirname, 'data.default.json');
if (!fs.existsSync(DATA_FILE)) {
  const seedSrc = fs.existsSync(SEED_FILE) ? SEED_FILE : path.join(__dirname, 'data.json');
  if (fs.existsSync(seedSrc)) fs.copyFileSync(seedSrc, DATA_FILE);
}

// The built React app (run `npm run build` inside /client) lands here.
const DIST_DIR = path.join(__dirname, 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');
const CLIENT_DIR = path.join(__dirname, 'client');
const CLIENT_NODE_MODULES = path.join(CLIENT_DIR, 'node_modules');

// Auto-build the React frontend the first time this runs, so a plain
// `node server.js` — with nothing built yet — just works, the same way
// the old plain-HTML version used to. Once client/dist exists, this is
// skipped and startup is instant; it only re-runs if dist/ is missing
// (e.g. first run, or after deleting dist/ to force a rebuild).
function ensureFrontendIsBuilt() {
  if (fs.existsSync(DIST_INDEX)) return;

  const { execSync } = require('child_process');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  console.log('');
  console.log('First run — building the React app (this happens once)...');
  console.log('');

  try {
    if (!fs.existsSync(CLIENT_NODE_MODULES)) {
      console.log('Installing frontend dependencies (npm install)...');
      execSync(`${npmCmd} install`, { cwd: CLIENT_DIR, stdio: 'inherit' });
    }
    console.log('Building the frontend (npm run build)...');
    execSync(`${npmCmd} run build`, { cwd: CLIENT_DIR, stdio: 'inherit' });
    console.log('');
    console.log('Build complete.');
    console.log('');
  } catch (err) {
    console.error('');
    console.error('Automatic build failed. Make sure Node.js/npm are installed');
    console.error('and you have an internet connection, then try running this');
    console.error('manually:');
    console.error('  cd client');
    console.error('  npm install');
    console.error('  npm run build');
    console.error('  cd ..');
    console.error('  node server.js');
    console.error('');
    process.exit(1);
  }
}

ensureFrontendIsBuilt();

// Uploaded product photos live outside the build output so they survive
// every `npm run build` (which wipes and regenerates dist/).
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ---------- REST API ----------
  if (pathname.startsWith('/api/')) {
    let data;
    try {
      data = readData();
    } catch (e) {
      return sendJSON(res, 500, { error: 'Could not read data.json' });
    }

    // ----- Products -----
    if (pathname === '/api/products' && req.method === 'GET') {
      return sendJSON(res, 200, data.products);
    }
    if (pathname === '/api/products' && req.method === 'POST') {
      const body = await readBody(req);
      body.id = Date.now();
      data.products.push(body);
      writeData(data);
      return sendJSON(res, 201, body);
    }
    let m = pathname.match(/^\/api\/products\/(\d+)$/);
    if (m && req.method === 'PUT') {
      const body = await readBody(req);
      const idx = data.products.findIndex(p => String(p.id) === m[1]);
      if (idx === -1) return sendJSON(res, 404, { error: 'Product not found' });
      data.products[idx] = { ...data.products[idx], ...body };
      writeData(data);
      return sendJSON(res, 200, data.products[idx]);
    }
    if (m && req.method === 'DELETE') {
      data.products = data.products.filter(p => String(p.id) !== m[1]);
      writeData(data);
      return sendJSON(res, 200, { ok: true });
    }

    // ----- Orders -----
    if (pathname === '/api/orders' && req.method === 'GET') {
      return sendJSON(res, 200, data.orders);
    }
    if (pathname === '/api/orders' && req.method === 'POST') {
      const body = await readBody(req);
      const orderId = 'SH-' + Math.floor(80000 + Math.random() * 9999);
      const order = {
        id: orderId,
        customer: body.customer || 'Guest Customer',
        email: body.email || '',
        phone: body.phone || '',
        address: body.address || '',
        city: body.city || '',
        items: body.items || [],
        total: body.total || 0,
        payment: body.payment || 'cod',
        date: new Date().toISOString().slice(0, 10),
        status: 'processing'
      };
      data.orders.unshift(order);

      // Keep the customer list in sync
      let cust = data.customers.find(c => c.email === order.email || c.name === order.customer);
      if (cust) {
        cust.orders += 1;
        cust.spent += order.total;
      } else {
        data.customers.push({ name: order.customer, email: order.email, orders: 1, spent: order.total });
      }

      writeData(data);
      return sendJSON(res, 201, order);
    }
    m = pathname.match(/^\/api\/orders\/([\w-]+)$/);
    if (m && req.method === 'PUT') {
      const body = await readBody(req);
      const idx = data.orders.findIndex(o => o.id === m[1]);
      if (idx === -1) return sendJSON(res, 404, { error: 'Order not found' });
      if (body.status) data.orders[idx].status = body.status;
      writeData(data);
      return sendJSON(res, 200, data.orders[idx]);
    }

    // ----- Customers -----
    if (pathname === '/api/customers' && req.method === 'GET') {
      return sendJSON(res, 200, data.customers);
    }

    // ----- Site Settings -----
    if (pathname === '/api/settings' && req.method === 'GET') {
      return sendJSON(res, 200, data.settings || {});
    }
    if (pathname === '/api/settings' && req.method === 'PUT') {
      const body = await readBody(req);
      data.settings = { ...data.settings, ...body };
      writeData(data);
      return sendJSON(res, 200, data.settings);
    }

    // ----- FAQs -----
    if (pathname === '/api/faqs' && req.method === 'GET') {
      return sendJSON(res, 200, data.faqs || []);
    }
    if (pathname === '/api/faqs' && req.method === 'POST') {
      const body = await readBody(req);
      if (!data.faqs) data.faqs = [];
      const faq = {
        id: Date.now(),
        category: body.category || 'General',
        question: body.question || '',
        answer: body.answer || '',
        order: data.faqs.length
      };
      data.faqs.push(faq);
      writeData(data);
      return sendJSON(res, 201, faq);
    }
    m = pathname.match(/^\/api\/faqs\/(\d+)$/);
    if (m && req.method === 'PUT') {
      const body = await readBody(req);
      const idx = (data.faqs || []).findIndex(f => String(f.id) === m[1]);
      if (idx === -1) return sendJSON(res, 404, { error: 'FAQ not found' });
      data.faqs[idx] = { ...data.faqs[idx], ...body };
      writeData(data);
      return sendJSON(res, 200, data.faqs[idx]);
    }
    if (m && req.method === 'DELETE') {
      data.faqs = (data.faqs || []).filter(f => String(f.id) !== m[1]);
      writeData(data);
      return sendJSON(res, 200, { ok: true });
    }

    // ----- Policies (Returns & Exchange, Shipping Info) -----
    if (pathname === '/api/policies' && req.method === 'GET') {
      return sendJSON(res, 200, data.policies || { returns: { intro: '', rules: [] }, shipping: { intro: '', rules: [] } });
    }
    m = pathname.match(/^\/api\/policies\/(returns|shipping)$/);
    if (m && req.method === 'PUT') {
      const body = await readBody(req);
      if (!data.policies) data.policies = {};
      const key = m[1];
      const existing = data.policies[key] || { intro: '', rules: [] };
      data.policies[key] = {
        intro: body.intro !== undefined ? body.intro : existing.intro,
        rules: Array.isArray(body.rules) ? body.rules : existing.rules
      };
      writeData(data);
      return sendJSON(res, 200, data.policies[key]);
    }

    // ----- Homepage hero banner slides -----
    if (pathname === '/api/hero-slides' && req.method === 'GET') {
      return sendJSON(res, 200, data.heroSlides || []);
    }
    if (pathname === '/api/hero-slides' && req.method === 'POST') {
      const body = await readBody(req);
      if (!data.heroSlides) data.heroSlides = [];
      const slide = {
        id: Date.now(),
        eyebrow: body.eyebrow || '',
        title: body.title || '',
        copy: body.copy || '',
        cta: body.cta || 'Shop Now',
        tag: body.tag || '',
        price: body.price || '',
        img: body.img || '',
        order: data.heroSlides.length
      };
      data.heroSlides.push(slide);
      writeData(data);
      return sendJSON(res, 201, slide);
    }
    m = pathname.match(/^\/api\/hero-slides\/(\d+)$/);
    if (m && req.method === 'PUT') {
      const body = await readBody(req);
      const idx = (data.heroSlides || []).findIndex(s => String(s.id) === m[1]);
      if (idx === -1) return sendJSON(res, 404, { error: 'Slide not found' });
      data.heroSlides[idx] = { ...data.heroSlides[idx], ...body };
      writeData(data);
      return sendJSON(res, 200, data.heroSlides[idx]);
    }
    if (m && req.method === 'DELETE') {
      data.heroSlides = (data.heroSlides || []).filter(s => String(s.id) !== m[1]);
      writeData(data);
      return sendJSON(res, 200, { ok: true });
    }

    // ----- Image upload (product photos) -----
    if (pathname === '/api/upload' && req.method === 'POST') {
      const body = await readBody(req);
      const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(body.dataUrl || '');
      if (!match) return sendJSON(res, 400, { error: 'Expected a base64 image data URL' });
      const extMap = { 'image/png':'png', 'image/jpeg':'jpg', 'image/gif':'gif', 'image/webp':'webp', 'image/svg+xml':'svg' };
      const ext = extMap[match[1]] || 'png';
      const buffer = Buffer.from(match[2], 'base64');
      const filename = 'img_' + Date.now() + '_' + Math.floor(Math.random()*10000) + '.' + ext;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      return sendJSON(res, 201, { url: '/uploads/' + filename });
    }

    return sendJSON(res, 404, { error: 'Unknown API route' });
  }

  // ---------- Uploaded product photos ----------
  if (pathname.startsWith('/uploads/')) {
    const filePath = path.join(UPLOADS_DIR, pathname.replace('/uploads/', ''));
    return fs.readFile(filePath, (err, content) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 — file not found'); }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(content);
    });
  }

  // ---------- Static files (the built React app in /dist) ----------
  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(
      '<h1>StyleHub</h1><p>The React app has not been built yet. Run:</p>' +
      '<pre>cd client\nnpm install\nnpm run build</pre>' +
      '<p>Then restart <code>node server.js</code>.</p>'
    );
  }

  let filePath = path.join(DIST_DIR, pathname);
  const ext = path.extname(filePath);

  // Any request without a file extension is a client-side route
  // (React Router) — always serve index.html and let the app route it.
  if (!ext) filePath = path.join(DIST_DIR, 'index.html');

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Fallback to index.html for any React Router path that wasn't caught above
      return fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, indexContent) => {
        if (err2) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 — file not found: ' + pathname); }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      });
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  StyleHub is running:');
  console.log('  Storefront   →  http://localhost:' + PORT);
  console.log('  Admin panel  →  http://localhost:' + PORT + '/admin');
  console.log('');
  console.log('  Press Ctrl+C to stop the server.');
});
