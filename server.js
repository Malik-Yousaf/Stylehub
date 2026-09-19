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
const crypto = require('crypto');
const net = require('net');
const tls = require('tls');

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
// SECURITY: cap request body size so a malicious (or accidental) huge
// payload can't exhaust server memory. Product photos are base64-encoded
// in the body, so the limit needs headroom above the raw file size —
// 10MB of base64 covers a ~7MB image, generous for product photos.
const MAX_BODY_BYTES = 10 * 1024 * 1024;
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    let tooBig = false;
    req.on('data', (chunk) => {
      if (tooBig) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        tooBig = true;
        const err = new Error('Request body too large');
        err.statusCode = 413;
        req.destroy();
        reject(err);
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (tooBig) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ---------- Admin authentication ----------
// A lightweight session system: no external packages needed.
//   - Password lives in data.json (settings.adminPassword) as a salted
//     hash (scrypt), never in plain text. Defaults to 'admin123' (hashed
//     on first run) — change it from Admin → Settings as soon as possible.
//   - On successful login, the server hands out a random token and keeps
//     it in memory (validAdminTokens) with an expiry. The browser stores
//     that token and sends it back as the "x-admin-token" header on every
//     admin request.
//   - Tokens live only in memory, so everyone is logged out if the server
//     restarts — an acceptable trade-off for a project this size, and it
//     means there's no session data to manage or expire manually.
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const validAdminTokens = new Map(); // token -> expiresAt

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(plain, stored) {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) {
    // Legacy plain-text password (or the untouched default) — compare
    // directly. Callers rehash-and-save on a successful legacy match so
    // this branch is only ever hit once per store.
    return typeof stored === 'string' && stored.length > 0
      ? timingSafeStringEqual(String(plain), stored)
      : timingSafeStringEqual(String(plain), DEFAULT_ADMIN_PASSWORD);
  }
  const [, salt, hash] = stored.split('$');
  const candidate = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal length to keep timing roughly
    // constant regardless of an early length mismatch.
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
function getAdminPassword(data) {
  return (data.settings && data.settings.adminPassword) || DEFAULT_ADMIN_PASSWORD;
}
function isAdminAuthed(req) {
  const token = req.headers['x-admin-token'];
  if (!token) return false;
  const expiresAt = validAdminTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    validAdminTokens.delete(token);
    return false;
  }
  return true;
}
function issueAdminToken() {
  const token = crypto.randomBytes(24).toString('hex');
  validAdminTokens.set(token, Date.now() + TOKEN_LIFETIME_MS);
  return token;
}
function requireAdmin(req, res) {
  if (!isAdminAuthed(req)) {
    sendJSON(res, 401, { error: 'Unauthorized — please log in to the admin panel again.' });
    return false;
  }
  return true;
}

// ---------- Login rate limiting ----------
// Simple in-memory sliding-window limiter to slow down password-guessing
// bots: 5 failed attempts from the same IP locks that IP out for 15
// minutes. Not a substitute for putting the admin panel behind a proper
// WAF/proxy on a real deployment, but it stops the most naive brute force.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map(); // ip -> { count, firstAttemptAt }

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}
function isLoginLocked(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}
function recordFailedLogin(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttemptAt: Date.now() });
  } else {
    entry.count++;
  }
}
function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}
// Never leak the password hash/value to the client via GET /api/settings.
function publicSettings(data) {
  // Never leak the admin password OR the SMTP credentials to the public
  // GET /api/settings endpoint (used by every visitor's browser).
  const { adminPassword, newsletter, chatbot, ...rest } = data.settings || {};
  // Only expose whether the chat widget should be shown — never the key.
  return { ...rest, chatbotEnabled: getChatbotSettings(data).enabled };
}

// ---------- Newsletter: discount codes + welcome email ----------
// A subscriber's welcome code looks like WELCOME10-K3F9QX — the discount
// percent is baked right into the code, followed by a random 6-character
// suffix (no 0/O/1/I, so it's easy to read/type from an email). Because
// the percent is embedded, the storefront's checkout can recognize and
// apply any of these codes instantly, without calling back to the server
// (see client/src/utils.js → getPromoPercent).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCodeSuffix() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return s;
}
function generateDiscountCode(percent, data) {
  const existing = new Set((data.subscribers || []).map((s) => s.code));
  let code;
  do {
    code = `WELCOME${percent}-${randomCodeSuffix()}`;
  } while (existing.has(code));
  return code;
}

// Newsletter/SMTP config lives at data.settings.newsletter. Defaults keep
// it "off" (no host/user configured) until the store owner fills it in
// from Admin → Settings.
function getNewsletterSettings(data) {
  const defaults = {
    smtpHost: '', smtpPort: 587, smtpSecure: false,
    smtpUser: '', smtpPass: '',
    fromEmail: '', fromName: '',
    discountPercent: 10
  };
  return { ...defaults, ...((data.settings && data.settings.newsletter) || {}) };
}

// ---------- AI chatbot (Google Gemini — Interactions API) ----------
// Config lives at data.settings.chatbot. Off by default until the store
// owner pastes in a free Gemini API key from Admin -> Settings (or sets
// the GEMINI_API_KEY environment variable, which wins if both are set).
// As of mid/late-2026, Google's recommended interface is the Interactions
// API (POST /v1beta/interactions) rather than the older generateContent
// endpoint, and older model names (e.g. gemini-2.5-flash) have been
// retired for new API keys — see https://ai.google.dev/gemini-api/docs/interactions-overview
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

function getChatbotSettings(data) {
  const defaults = { apiKey: '', enabled: true };
  return { ...defaults, ...((data.settings && data.settings.chatbot) || {}) };
}

// Builds a compact system prompt out of the store's own live data (name,
// contact info, catalog, FAQs, policies) so the model answers using real
// StyleHub info instead of making things up.
function buildStoreContext(data) {
  const s = data.settings || {};
  const storeName = s.storeName || 'StyleHub';
  const lines = [];
  lines.push(`You are the friendly shopping assistant for ${storeName}, an online fashion store (${s.tagline || 'modern lifestyle & fashion store'}). Answer customer questions about products, orders, shipping, and returns using ONLY the store information below. Keep replies short (2-4 sentences), warm, and helpful. If you don't know something from the info given, say you're not sure and suggest contacting the store on WhatsApp. Never invent prices, stock, or policies that aren't listed below. Prices are in PKR (Rs.).`);

  lines.push(`\nStore contact: phone ${s.phone || 'n/a'}, WhatsApp ${s.whatsapp || 'n/a'}, email ${s.email || 'n/a'}, address ${s.address || 'n/a'}.`);

  const products = data.products || [];
  if (products.length) {
    lines.push('\nProduct catalog:');
    for (const p of products) {
      lines.push(`- ${p.name} (${p.cat}): Rs. ${p.price}${p.was ? ` (was Rs. ${p.was})` : ''}, sizes ${(p.sizes || []).join('/') || 'n/a'}, ${p.stock > 0 ? `${p.stock} in stock` : 'out of stock'}.`);
    }
  }

  const faqs = data.faqs || [];
  if (faqs.length) {
    lines.push('\nFrequently asked questions:');
    for (const f of faqs) lines.push(`Q: ${f.question}\nA: ${f.answer}`);
  }

  const policies = data.policies || {};
  if (policies.returns) {
    lines.push(`\nReturns policy: ${policies.returns.intro || ''} ${(policies.returns.rules || []).join(' ')}`);
  }
  if (policies.shipping) {
    lines.push(`\nShipping policy: ${policies.shipping.intro || ''} ${(policies.shipping.rules || []).join(' ')}`);
  }

  return lines.join('\n');
}

// Calls the Gemini Interactions API (client.interactions.create equivalent
// over plain REST). Conversation continuity is handled server-side by
// Google: we pass back the previous interaction's id as
// `previous_interaction_id` instead of resending the whole chat history
// ourselves. `system_instruction` is interaction-scoped (not carried over
// automatically), so it's re-sent on every call.
function callGemini(apiKey, systemPrompt, userMessage, previousInteractionId) {
  const body = {
    model: GEMINI_MODEL,
    system_instruction: systemPrompt,
    input: userMessage,
    generation_config: { temperature: 0.6 }
  };
  if (previousInteractionId) body.previous_interaction_id = previousInteractionId;

  return fetch(GEMINI_INTERACTIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body)
  }).then(async (resp) => {
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = (json.error && json.error.message) || `Gemini API error (${resp.status})`;
      throw new Error(msg);
    }
    // Current schema: { id, status, steps: [ { type: 'thought', ... }, { type: 'model_output', content: [{ type: 'text', text }] } ] }
    // Older/alternate schema seen in some accounts: { id, outputs: [{ type: 'text', text }] }
    let text = '';
    if (Array.isArray(json.steps)) {
      text = json.steps
        .filter(step => step.type === 'model_output' && Array.isArray(step.content))
        .flatMap(step => step.content.filter(c => c.type === 'text').map(c => c.text || ''))
        .join('')
        .trim();
    } else if (Array.isArray(json.outputs)) {
      text = json.outputs.filter(o => o.type === 'text').map(o => o.text || '').join('').trim();
    } else if (typeof json.output_text === 'string') {
      text = json.output_text.trim();
    }
    if (!text) throw new Error('Gemini returned an empty response');
    return { text, interactionId: json.id || null };
  });
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// A minimal welcome-email design — dark header, gold accent, dashed-box
// code — matching the storefront's own look (--ink / --gold / --paper).
function buildDiscountEmailHTML({ storeName, code, percent, siteUrl }) {
  const name = escapeHtml(storeName || 'StyleHub');
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#efece4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efece4;padding:40px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#faf9f6;border:1px solid #e2ddd0;">
          <tr><td style="background:#0b0b0c;padding:28px 32px;text-align:center;">
            <span style="color:#d4af37;font-size:22px;letter-spacing:2px;font-family:Georgia,serif;">${name}</span>
          </td></tr>
          <tr><td style="padding:36px 32px 8px;text-align:center;">
            <p style="margin:0 0 6px;color:#6b675e;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Welcome</p>
            <h1 style="margin:0 0 18px;color:#0b0b0c;font-size:24px;font-family:Georgia,serif;">You're on the list</h1>
            <p style="margin:0 0 26px;color:#333;font-size:14px;line-height:1.6;">
              Thanks for subscribing to ${name}. Here's your welcome code — good for
              <strong>${percent}% off</strong> your first order.
            </p>
          </td></tr>
          <tr><td style="padding:0 32px 28px;text-align:center;">
            <div style="border:2px dashed #b8912f;background:#f4ecd8;padding:18px;">
              <span style="font-family:'Courier New',monospace;font-size:22px;letter-spacing:3px;color:#0b0b0c;font-weight:bold;">${escapeHtml(code)}</span>
            </div>
          </td></tr>
          <tr><td style="padding:0 32px 36px;text-align:center;">
            <a href="${escapeHtml(siteUrl || '#')}" style="display:inline-block;background:#0b0b0c;color:#d4af37;text-decoration:none;padding:13px 30px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Shop Now</a>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #e2ddd0;text-align:center;">
            <p style="margin:0;color:#9b968a;font-size:11px;line-height:1.6;">
              Enter this code at checkout. One-time welcome offer, can't be combined with other codes.<br/>
              You're receiving this because you subscribed on our website.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
function buildDiscountEmailText({ storeName, code, percent, siteUrl }) {
  const name = storeName || 'StyleHub';
  return `Welcome to ${name}!\n\nThanks for subscribing. Here's your welcome code for ${percent}% off your first order:\n\n    ${code}\n\nEnter it at checkout${siteUrl ? ': ' + siteUrl : '.'}\n\nOne-time welcome offer, can't be combined with other codes.`;
}
function encodeMimeSubject(subject) {
  if (/^[\x00-\x7F]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

// A tiny hand-rolled SMTP client (AUTH LOGIN, STARTTLS or implicit TLS) so
// this project can send real email using only Node's built-in net/tls
// modules — no npm dependency required. Works with Gmail (use an App
// Password), Outlook, SendGrid SMTP, Mailtrap, and most other providers.
function smtpSendMail(cfg, { to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
      return reject(new Error('SMTP is not configured yet (Admin → Settings → Newsletter Email).'));
    }
    const port = Number(cfg.smtpPort) || 587;
    const implicitTLS = !!cfg.smtpSecure || port === 465;

    let sock = implicitTLS
      ? tls.connect({ host: cfg.smtpHost, port, servername: cfg.smtpHost })
      : net.connect({ host: cfg.smtpHost, port });

    let buffer = '';
    let pending = null;
    let done = false;

    const timer = setTimeout(() => finish(new Error('Connection to the mail server timed out.')), 20000);

    function finish(err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { sock.destroy(); } catch (e) { /* ignore */ }
      if (err) reject(err); else resolve();
    }
    function onData(chunk) {
      buffer += chunk.toString('utf8');
      let idx;
      while ((idx = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const m = /^(\d{3})([ -])(.*)$/.exec(line);
        if (!m) continue;
        if (m[2] === ' ' && pending) {
          const code = parseInt(m[1], 10);
          const p = pending;
          pending = null;
          if (p.codes.includes(code)) p.resolve(m[3]);
          else p.reject(new Error(`Mail server said: ${code} ${m[3]}`));
        }
      }
    }
    function onError(err) { finish(err); }
    function attach(s) { s.on('data', onData); s.on('error', onError); }
    function detach(s) { s.removeListener('data', onData); s.removeListener('error', onError); }
    function expect(codes) {
      return new Promise((res, rej) => { pending = { codes, resolve: res, reject: rej }; });
    }
    function send(line) { sock.write(line + '\r\n'); }

    attach(sock);

    async function run() {
      await expect([220]);
      send('EHLO stylehub.local');
      await expect([250]);

      if (!implicitTLS) {
        send('STARTTLS');
        await expect([220]);
        detach(sock);
        const plain = sock;
        sock = tls.connect({ socket: plain, host: cfg.smtpHost, servername: cfg.smtpHost });
        await new Promise((res, rej) => {
          sock.once('secureConnect', res);
          sock.once('error', rej);
        });
        attach(sock);
        send('EHLO stylehub.local');
        await expect([250]);
      }

      send('AUTH LOGIN');
      await expect([334]);
      send(Buffer.from(cfg.smtpUser, 'utf8').toString('base64'));
      await expect([334]);
      send(Buffer.from(cfg.smtpPass, 'utf8').toString('base64'));
      await expect([235]);

      const fromAddr = cfg.fromEmail || cfg.smtpUser;
      send(`MAIL FROM:<${fromAddr}>`);
      await expect([250]);
      send(`RCPT TO:<${to}>`);
      await expect([250]);
      send('DATA');
      await expect([354]);

      const fromHeader = cfg.fromName ? `${cfg.fromName} <${fromAddr}>` : fromAddr;
      const boundary = 'stylehub_' + crypto.randomBytes(8).toString('hex');
      const headerLines = [
        `From: ${fromHeader}`,
        `To: ${to}`,
        `Subject: ${encodeMimeSubject(subject)}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${crypto.randomBytes(12).toString('hex')}@stylehub.local>`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`
      ].join('\r\n');
      const bodyLines =
        `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n\r\n` +
        `--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}\r\n\r\n` +
        `--${boundary}--`;
      // Dot-stuffing per RFC 5321: escape lines that start with '.'
      const raw = (headerLines + '\r\n\r\n' + bodyLines).replace(/\r\n\./g, '\r\n..');

      sock.write(raw + '\r\n.\r\n');
      await expect([250]);

      send('QUIT');
      finish(null);
    }

    run().catch((err) => finish(err));
  });
}

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (e) {
    // SECURITY/STABILITY: without this catch, a rejected readBody()
    // promise (malformed JSON, an oversized upload, a dropped connection
    // mid-request) becomes an unhandled promise rejection — which crashes
    // the whole Node process on modern versions, taking the entire store
    // down from a single bad request. Always answer with a clean error
    // instead of letting that happen.
    if (!res.headersSent) {
      const status = e && e.statusCode === 413 ? 413 : 400;
      sendJSON(res, status, { error: status === 413 ? 'Request body too large' : 'Bad request' });
    } else {
      try { res.end(); } catch (_) { /* connection already gone */ }
    }
  }
});

async function handleRequest(req, res) {
  // Baseline security headers on every response.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

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

    // ----- Admin authentication -----
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const ip = clientIp(req);
      if (isLoginLocked(ip)) {
        return sendJSON(res, 429, { error: 'Too many attempts. Please wait 15 minutes and try again.' });
      }
      const body = await readBody(req);
      const stored = getAdminPassword(data);
      if (!verifyPassword(body.password || '', stored)) {
        recordFailedLogin(ip);
        return sendJSON(res, 401, { error: 'Incorrect password' });
      }
      clearLoginAttempts(ip);
      // Transparently upgrade a legacy plain-text password to a proper
      // salted hash the first time it's used successfully.
      if (!stored.startsWith('scrypt$')) {
        data.settings = { ...data.settings, adminPassword: hashPassword(body.password) };
        writeData(data);
      }
      return sendJSON(res, 200, { token: issueAdminToken() });
    }
    if (pathname === '/api/admin/logout' && req.method === 'POST') {
      const token = req.headers['x-admin-token'];
      if (token) validAdminTokens.delete(token);
      return sendJSON(res, 200, { ok: true });
    }
    if (pathname === '/api/admin/change-password' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      if (!verifyPassword(body.oldPassword || '', getAdminPassword(data))) {
        return sendJSON(res, 401, { error: 'Current password is incorrect' });
      }
      if (!body.newPassword || body.newPassword.length < 8) {
        return sendJSON(res, 400, { error: 'New password must be at least 8 characters' });
      }
      data.settings = { ...data.settings, adminPassword: hashPassword(body.newPassword) };
      writeData(data);
      return sendJSON(res, 200, { ok: true });
    }

    // ----- Products -----
    if (pathname === '/api/products' && req.method === 'GET') {
      return sendJSON(res, 200, data.products);
    }
    if (pathname === '/api/products' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      body.id = Date.now();
      data.products.push(body);
      writeData(data);
      return sendJSON(res, 201, body);
    }
    let m = pathname.match(/^\/api\/products\/(\d+)$/);
    if (m && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const idx = data.products.findIndex(p => String(p.id) === m[1]);
      if (idx === -1) return sendJSON(res, 404, { error: 'Product not found' });
      data.products[idx] = { ...data.products[idx], ...body };
      writeData(data);
      return sendJSON(res, 200, data.products[idx]);
    }
    if (m && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      data.products = data.products.filter(p => String(p.id) !== m[1]);
      writeData(data);
      return sendJSON(res, 200, { ok: true });
    }

    // ----- Orders -----
    if (pathname === '/api/orders' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return sendJSON(res, 200, data.orders);
    }
    if (pathname === '/api/orders' && req.method === 'POST') {
      // Placing an order is a public, unauthenticated customer action.
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
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const idx = data.orders.findIndex(o => o.id === m[1]);
      if (idx === -1) return sendJSON(res, 404, { error: 'Order not found' });
      if (body.status) data.orders[idx].status = body.status;
      writeData(data);
      return sendJSON(res, 200, data.orders[idx]);
    }

    // Public order tracking — customer looks up their own order by ID + email.
    // No admin auth required, but the email must match so strangers can't
    // browse other people's orders just by guessing an order ID.
    m = pathname.match(/^\/api\/track\/([\w-]+)$/);
    if (m && req.method === 'GET') {
      const email = (parsed.query.email || '').trim().toLowerCase();
      const order = data.orders.find(o => o.id.toLowerCase() === m[1].toLowerCase());
      if (!order || !email || order.email.trim().toLowerCase() !== email) {
        return sendJSON(res, 404, { error: 'No matching order found. Please check your Order ID and email.' });
      }
      const { id, status, date, eta, items, total, payment, city } = order;
      return sendJSON(res, 200, { id, status, date, eta, items, total, payment, city });
    }

    // ----- Customers -----
    if (pathname === '/api/customers' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return sendJSON(res, 200, data.customers);
    }

    // ----- Site Settings -----
    if (pathname === '/api/settings' && req.method === 'GET') {
      return sendJSON(res, 200, publicSettings(data));
    }
    if (pathname === '/api/settings' && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      delete body.adminPassword; // change password only via /api/admin/change-password
      data.settings = { ...data.settings, ...body };
      writeData(data);
      return sendJSON(res, 200, publicSettings(data));
    }

    // ----- Newsletter: subscribe (public) -----
    // A visitor enters their email → they get a personal discount code
    // back immediately, and — if SMTP is configured — we also email it
    // to them using the template above.
    if (pathname === '/api/subscribe' && req.method === 'POST') {
      const body = await readBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        return sendJSON(res, 400, { error: 'Please enter a valid email address.' });
      }

      if (!data.subscribers) data.subscribers = [];
      const nl = getNewsletterSettings(data);
      let sub = data.subscribers.find((s) => s.email === email);
      const isNew = !sub;
      if (!sub) {
        sub = {
          email,
          code: generateDiscountCode(nl.discountPercent, data),
          percent: nl.discountPercent,
          subscribedAt: new Date().toISOString()
        };
        data.subscribers.push(sub);
        writeData(data);
      }

      const storeName = (data.settings && data.settings.storeName) || 'StyleHub';
      const siteUrl = req.headers.origin || '';
      let emailSent = false;
      try {
        await smtpSendMail(nl, {
          to: email,
          subject: `Here's your ${sub.percent}% off code, welcome to ${storeName}!`,
          html: buildDiscountEmailHTML({ storeName, code: sub.code, percent: sub.percent, siteUrl }),
          text: buildDiscountEmailText({ storeName, code: sub.code, percent: sub.percent, siteUrl })
        });
        emailSent = true;
      } catch (e) {
        console.error('[newsletter] Could not email', email, '-', e.message);
      }

      return sendJSON(res, 200, {
        subscribed: true,
        alreadySubscribed: !isNew,
        code: sub.code,
        percent: sub.percent,
        emailSent
      });
    }

    // ----- Newsletter: admin subscriber list -----
    if (pathname === '/api/admin/subscribers' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return sendJSON(res, 200, (data.subscribers || []).slice().reverse());
    }

    // ----- Newsletter: admin SMTP/email settings -----
    if (pathname === '/api/admin/email-settings' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const { smtpPass, ...rest } = getNewsletterSettings(data);
      return sendJSON(res, 200, { ...rest, hasPassword: !!smtpPass });
    }
    if (pathname === '/api/admin/email-settings' && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const current = getNewsletterSettings(data);
      const next = {
        smtpHost: body.smtpHost !== undefined ? String(body.smtpHost).trim() : current.smtpHost,
        smtpPort: body.smtpPort !== undefined ? (Number(body.smtpPort) || 587) : current.smtpPort,
        smtpSecure: body.smtpSecure !== undefined ? !!body.smtpSecure : current.smtpSecure,
        smtpUser: body.smtpUser !== undefined ? String(body.smtpUser).trim() : current.smtpUser,
        // Blank password field = "leave unchanged" (so the admin doesn't
        // have to retype it every time they save other fields).
        smtpPass: body.smtpPass ? String(body.smtpPass) : current.smtpPass,
        fromEmail: body.fromEmail !== undefined ? String(body.fromEmail).trim() : current.fromEmail,
        fromName: body.fromName !== undefined ? String(body.fromName).trim() : current.fromName,
        discountPercent: body.discountPercent !== undefined
          ? Math.max(1, Math.min(90, Number(body.discountPercent) || 10))
          : current.discountPercent
      };
      if (!data.settings) data.settings = {};
      data.settings.newsletter = next;
      writeData(data);
      const { smtpPass, ...rest } = next;
      return sendJSON(res, 200, { ...rest, hasPassword: !!smtpPass });
    }
    // Lets the admin fire off a test email to confirm SMTP creds work
    // before relying on them for real subscribers.
    if (pathname === '/api/admin/email-settings/test' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const to = (body.email || '').trim();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(to)) return sendJSON(res, 400, { error: 'Enter a valid email to send the test to.' });
      const nl = getNewsletterSettings(data);
      const storeName = (data.settings && data.settings.storeName) || 'StyleHub';
      try {
        await smtpSendMail(nl, {
          to,
          subject: `Test email from ${storeName}`,
          html: `<p style="font-family:Arial,sans-serif;font-size:14px;">This is a test email from your ${escapeHtml(storeName)} newsletter settings. If you got this, your SMTP setup is working.</p>`,
          text: `This is a test email from your ${storeName} newsletter settings. If you got this, your SMTP setup is working.`
        });
        return sendJSON(res, 200, { ok: true });
      } catch (e) {
        return sendJSON(res, 400, { error: e.message });
      }
    }

    // ----- AI chatbot settings (admin) -----
    if (pathname === '/api/admin/chatbot-settings' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const { apiKey, ...rest } = getChatbotSettings(data);
      return sendJSON(res, 200, { ...rest, hasApiKey: !!(process.env.GEMINI_API_KEY || apiKey) });
    }
    if (pathname === '/api/admin/chatbot-settings' && req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const current = getChatbotSettings(data);
      const next = {
        // Blank field = "leave unchanged", same convention as the SMTP settings above.
        apiKey: body.apiKey ? String(body.apiKey).trim() : current.apiKey,
        enabled: body.enabled !== undefined ? !!body.enabled : current.enabled
      };
      if (!data.settings) data.settings = {};
      data.settings.chatbot = next;
      writeData(data);
      const { apiKey, ...rest } = next;
      return sendJSON(res, 200, { ...rest, hasApiKey: !!(process.env.GEMINI_API_KEY || apiKey) });
    }

    // ----- AI chatbot (public — the storefront widget talks to this) -----
    if (pathname === '/api/chat' && req.method === 'POST') {
      const chatbotSettings = getChatbotSettings(data);
      const apiKey = process.env.GEMINI_API_KEY || chatbotSettings.apiKey;
      if (!chatbotSettings.enabled || !apiKey) {
        return sendJSON(res, 503, { error: 'The chat assistant is not set up yet. Please contact us on WhatsApp instead.' });
      }
      const body = await readBody(req);
      const message = String(body.message || '').trim().slice(0, 1000);
      if (!message) return sendJSON(res, 400, { error: 'Message is required' });
      const previousInteractionId = body.previousInteractionId ? String(body.previousInteractionId) : null;
      try {
        const { text, interactionId } = await callGemini(apiKey, buildStoreContext(data), message, previousInteractionId);
        return sendJSON(res, 200, { reply: text, interactionId });
      } catch (e) {
        return sendJSON(res, 502, { error: e.message || 'Could not reach the chat assistant right now.' });
      }
    }

    // ----- FAQs -----
    if (pathname === '/api/faqs' && req.method === 'GET') {
      return sendJSON(res, 200, data.faqs || []);
    }
    if (pathname === '/api/faqs' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
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
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const idx = (data.faqs || []).findIndex(f => String(f.id) === m[1]);
      if (idx === -1) return sendJSON(res, 404, { error: 'FAQ not found' });
      data.faqs[idx] = { ...data.faqs[idx], ...body };
      writeData(data);
      return sendJSON(res, 200, data.faqs[idx]);
    }
    if (m && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
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
      if (!requireAdmin(req, res)) return;
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
      if (!requireAdmin(req, res)) return;
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
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const idx = (data.heroSlides || []).findIndex(s => String(s.id) === m[1]);
      if (idx === -1) return sendJSON(res, 404, { error: 'Slide not found' });
      data.heroSlides[idx] = { ...data.heroSlides[idx], ...body };
      writeData(data);
      return sendJSON(res, 200, data.heroSlides[idx]);
    }
    if (m && req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      data.heroSlides = (data.heroSlides || []).filter(s => String(s.id) !== m[1]);
      writeData(data);
      return sendJSON(res, 200, { ok: true });
    }

    // ----- Image upload (product photos) -----
    if (pathname === '/api/upload' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(body.dataUrl || '');
      if (!match) return sendJSON(res, 400, { error: 'Expected a base64 image data URL' });
      // SECURITY: SVG is intentionally excluded. An SVG file can embed
      // <script> tags that execute if the file is ever opened directly
      // (e.g. the URL is pasted into a new tab), which would make product
      // photo uploads a stored-XSS vector. Raster formats only.
      const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
      const ext = extMap[match[1]];
      if (!ext) return sendJSON(res, 400, { error: 'Unsupported image type — use PNG, JPG, GIF or WEBP.' });
      const buffer = Buffer.from(match[2], 'base64');
      const filename = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 10000) + '.' + ext;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      return sendJSON(res, 201, { url: '/uploads/' + filename });
    }

    return sendJSON(res, 404, { error: 'Unknown API route' });
  }

  // ---------- Uploaded product photos ----------
  if (pathname.startsWith('/uploads/')) {
    // SECURITY: resolve the real path and make sure it's still inside
    // UPLOADS_DIR before touching the filesystem — without this check, a
    // request like "/uploads/../../data.json" would happily read files
    // outside the uploads folder (path traversal). decodeURIComponent
    // first so encoded sequences like %2e%2e can't sneak past the check.
    let requested;
    try {
      requested = decodeURIComponent(pathname.slice('/uploads/'.length));
    } catch (e) {
      requested = '';
    }
    const filePath = path.join(UPLOADS_DIR, requested);
    const resolvedUploadsBase = path.resolve(UPLOADS_DIR);
    const resolvedRequested = path.resolve(filePath);
    if (resolvedRequested !== resolvedUploadsBase && !resolvedRequested.startsWith(resolvedUploadsBase + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 — forbidden');
    }
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

  // SECURITY: same path-traversal containment check as /uploads/ above —
  // a request like "/../server.js" or "/../../data.json" must never be
  // able to escape DIST_DIR.
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch (e) {
    decodedPathname = pathname;
  }
  let filePath = path.join(DIST_DIR, decodedPathname);
  const resolvedDistBase = path.resolve(DIST_DIR);
  const resolvedFilePath = path.resolve(filePath);
  if (resolvedFilePath !== resolvedDistBase && !resolvedFilePath.startsWith(resolvedDistBase + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 — forbidden');
  }
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
}

server.listen(PORT, () => {
  console.log('');
  console.log('  StyleHub is running:');
  console.log('  Storefront   →  http://localhost:' + PORT);
  console.log('  Admin panel  →  http://localhost:' + PORT + '/admin');
  console.log('');
  console.log('  Press Ctrl+C to stop the server.');
});
