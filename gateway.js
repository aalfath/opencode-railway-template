// Railway gateway for OpenCode (aalfath/opencode-railway-template).
// Runs with the Bun runtime built into the opencode binary (BUN_BE_BUN=1).
// - starts `opencode serve` on 127.0.0.1:4096 and exits if it stops, so Railway restarts the service
// - proxies HTTP, SSE and WebSocket traffic from $PORT to it
// - /login: password form that turns OPENCODE_PASSWORD into a one-time pairing link
//   (the OpenCode 2 web UI signs in only with pairing links)
// - /healthz: unauthenticated health check for Railway
import { mkdirSync } from "node:fs";
import { timingSafeEqual, createHash } from "node:crypto";

const PORT = Number(process.env.PORT || 8080);
const UP_PORT = Number(process.env.OPENCODE_INTERNAL_PORT || 4096);
const UP = `http://127.0.0.1:${UP_PORT}`;
const PASSWORD = process.env.OPENCODE_PASSWORD || process.env.OPENCODE_SERVER_PASSWORD || "";
const HOME = process.env.HOME || "/data/home";
const WORKSPACE = process.env.OPENCODE_WORKSPACE || "/data/workspace";

if (PASSWORD.length < 12) {
  console.error("[gateway] OPENCODE_PASSWORD must be set (12+ characters). Refusing to start without a password.");
  process.exit(1);
}
for (const d of [HOME, WORKSPACE]) mkdirSync(d, { recursive: true });

const childEnv = { ...process.env, OPENCODE_PASSWORD: PASSWORD };
delete childEnv.BUN_BE_BUN;
delete childEnv.OPENCODE_SERVER_PASSWORD;
const child = Bun.spawn(["/usr/local/bin/opencode", "serve", "--hostname", "127.0.0.1", "--port", String(UP_PORT)], {
  cwd: WORKSPACE, env: childEnv, stdout: "inherit", stderr: "inherit",
});
child.exited.then((code) => { console.error(`[gateway] opencode exited (${code}); stopping`); process.exit(code || 1); });
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => { child.kill(sig); setTimeout(() => process.exit(0), 8000); });

const basic = "Basic " + Buffer.from(`opencode:${PASSWORD}`).toString("base64");
const sha = (s) => createHash("sha256").update(String(s)).digest();
const passwordOk = (s) => timingSafeEqual(sha(s), sha(PASSWORD));

// Simple login throttle: 10 failed attempts per client per 15 minutes.
const fails = new Map();
const clientIp = (req, server) => req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || server.requestIP(req)?.address || "?";
function throttled(ip) {
  const f = fails.get(ip);
  if (!f) return false;
  if (Date.now() - f.since > 15 * 60e3) { fails.delete(ip); return false; }
  return f.count >= 10;
}
function noteFail(ip) {
  const f = fails.get(ip) || { count: 0, since: Date.now() };
  f.count++; fails.set(ip, f);
  if (fails.size > 10000) fails.clear();
}

const HOP = ["connection", "keep-alive", "transfer-encoding", "upgrade", "proxy-connection", "te", "trailer"];
function upstreamHeaders(req) {
  const h = new Headers(req.headers);
  for (const k of HOP) h.delete(k);
  return h;
}

// Is this browser/client signed in? Ask OpenCode itself with the caller's cookie or Basic auth.
async function signedIn(req) {
  const h = new Headers();
  for (const k of ["cookie", "authorization", "host"]) { const v = req.headers.get(k); if (v) h.set(k, v); }
  if (!h.has("cookie") && !h.has("authorization")) return false;
  try { return (await fetch(`${UP}/api/info`, { headers: h })).status === 200; } catch { return false; }
}

const page = (msg = "") => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · OpenCode</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f0f10;color:#eee;font:15px system-ui,sans-serif}
form{background:#1a1a1c;padding:28px;border-radius:10px;width:min(340px,90vw);box-shadow:0 4px 24px #0008}
h1{font-size:18px;margin:0 0 16px}input{width:100%;box-sizing:border-box;padding:10px;border-radius:6px;border:1px solid #333;background:#0f0f10;color:#eee;font-size:15px}
button{margin-top:14px;width:100%;padding:10px;border:0;border-radius:6px;background:#fafafa;color:#111;font-weight:600;font-size:15px;cursor:pointer}
p{color:#f87171;margin:12px 0 0}small{display:block;color:#888;margin-top:14px;line-height:1.4}</style></head>
<body><form method="post" action="/login"><h1>OpenCode</h1>
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
<button type="submit">Sign in</button>${msg ? `<p>${msg}</p>` : ""}
<small>The password is the <code>OPENCODE_PASSWORD</code> variable of this service on Railway.</small></form></body></html>`,
  { status: msg ? 401 : 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY" } });

async function login(req, server) {
  const ip = clientIp(req, server);
  if (throttled(ip)) return page("Too many attempts. Try again in 15 minutes.");
  let pw = "";
  try { pw = String((await req.formData()).get("password") || ""); } catch {}
  if (!passwordOk(pw)) { noteFail(ip); await Bun.sleep(500); return page("Wrong password."); }
  fails.delete(ip);
  const r = await fetch(`${UP}/api/pair`, { method: "POST", headers: { authorization: basic, "content-type": "application/json" }, body: "{}" });
  if (r.status !== 200) return new Response("OpenCode is not ready yet, try again in a moment.", { status: 503 });
  const { code } = await r.json();
  return new Response(null, { status: 303, headers: { location: `/auth/connect/${encodeURIComponent(code)}`, "cache-control": "no-store" } });
}

const server = Bun.serve({
  port: PORT,
  hostname: "::",
  idleTimeout: 0,
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/healthz") {
      try {
        const r = await fetch(`${UP}/api/info`, { headers: { authorization: basic } });
        return new Response(r.status === 200 ? "ok" : "starting", { status: r.status === 200 ? 200 : 503 });
      } catch { return new Response("starting", { status: 503 }); }
    }
    if (path === "/login") {
      if (req.method === "POST") return login(req, server);
      return page();
    }

    if ((req.headers.get("upgrade") || "").toLowerCase() === "websocket") {
      if (!(await signedIn(req))) return new Response("Authentication required", { status: 401 });
      const ok = server.upgrade(req, { data: { target: `ws://127.0.0.1:${UP_PORT}${path}${url.search}` } });
      return ok ? undefined : new Response("Upgrade failed", { status: 400 });
    }

    // Send signed-out browsers that open the app to the login form.
    const nav = req.method === "GET" && (req.headers.get("sec-fetch-mode") === "navigate" || (req.headers.get("accept") || "").includes("text/html"));
    if (nav && !path.startsWith("/api/") && !path.startsWith("/auth/") && !(await signedIn(req))) {
      return new Response(null, { status: 302, headers: { location: "/login", "cache-control": "no-store" } });
    }

    const hasBody = !["GET", "HEAD"].includes(req.method);
    try {
      return await fetch(`${UP}${path}${url.search}`, {
        method: req.method, headers: upstreamHeaders(req), body: hasBody ? req.body : undefined,
        redirect: "manual", decompress: false, duplex: "half",
      });
    } catch (e) {
      return new Response("OpenCode is starting, retry in a few seconds.", { status: 502 });
    }
  },
  websocket: {
    open(ws) {
      ws.data.queue = [];
      const up = new WebSocket(ws.data.target, { headers: { authorization: basic } });
      up.binaryType = "arraybuffer";
      ws.data.up = up;
      up.onopen = () => { for (const m of ws.data.queue) up.send(m); ws.data.queue = null; };
      up.onmessage = (e) => ws.send(e.data);
      up.onclose = (e) => ws.close(e.code === 1005 || e.code === 1006 ? 1000 : e.code, e.reason);
      up.onerror = () => ws.close(1011, "upstream error");
    },
    message(ws, msg) {
      if (ws.data.queue) ws.data.queue.push(msg); else ws.data.up.send(msg);
    },
    close(ws) { try { ws.data.up?.close(); } catch {} },
  },
});
console.log(`[gateway] listening on :${server.port}, OpenCode on 127.0.0.1:${UP_PORT}, workspace ${WORKSPACE}`);
