"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const routes_1 = __importDefault(require("./routes"));
const internalToken_1 = require("./server/lib/internalToken");
/* ── Path resolver: works for both dev (tsx exocore-web/index.ts)
 * and prod (node dist/index.js).
 * In dev  → __dirname = <repo>/exocore-web   → static-pages/ is here
 * In prod → __dirname = <repo>/dist           → static-pages/ is at ../exocore-web
 */
const APP_ROOT = fs_1.default.existsSync(path_1.default.join(__dirname, "static-pages"))
    ? __dirname
    : path_1.default.join(__dirname, "..", "exocore-web");
/* ── VNC module-level state ───────────────────────────────── */
/* WebSocket bridge is now handled by vncWss in index.ts and
 * served through the main HTTP server at /exocore/api/vnc/ws.
 * This removes the separate port-6080 listener so the proxy
 * works correctly inside Replit and other reverse-proxy envs. */
const _vnc = {};
class App {
    constructor() {
        this.app = (0, express_1.default)();
    }
    async init() {
        this.setupBaseMiddleware();
        this.setupDevGateMiddleware();
        this.setupRoutes();
        this.setupProxyRoute();
        this.setupErrorHandling();
    }
    setupDevGateMiddleware() {
        const devsPath1 = path_1.default.join(process.cwd(), "exocore-web", "devs.json");
        const devsPath2 = path_1.default.join(process.cwd(), "devs.json");
        const readDevs = () => {
            const p = fs_1.default.existsSync(devsPath1) ? devsPath1 : devsPath2;
            if (!fs_1.default.existsSync(p))
                return null;
            try {
                return JSON.parse(fs_1.default.readFileSync(p, "utf-8"));
            }
            catch {
                return null;
            }
        };
        const makeToken = (user, pass) => {
            const secret = crypto_1.default.createHash("sha256").update(user + ":" + pass + ":exogate").digest("hex");
            return crypto_1.default.createHmac("sha256", secret).update("exocore-dev-session-v1").digest("hex");
        };
        const parseCookie = (req, name) => {
            const header = req.headers.cookie || "";
            for (const pair of header.split(";")) {
                const idx = pair.indexOf("=");
                if (idx === -1)
                    continue;
                if (pair.slice(0, idx).trim() === name)
                    return decodeURIComponent(pair.slice(idx + 1).trim());
            }
            return "";
        };
        this.app.use("/exocore", (req, res, next) => {
            const p = req.path;
            // ── Local install bypass ─────────────────────────────────────────
            // Only skip the gate when the linux.sh launcher explicitly sets
            // EXOCORE_LOCAL=true.  Docker / hosted deployments never set this
            // env var so the gate stays active for them regardless of hostname.
            if (process.env.EXOCORE_LOCAL === "true") {
                return next();
            }
            // Always allow: port proxy, gate page itself, gate API,
            // and any API call that already carries an Exocore auth token
            // (validated by individual route handlers — no double-gating needed).
            if (p.startsWith("/port/") ||
                p === "/dev-gate" || p === "/dev-gate/" ||
                p.startsWith("/api/dev-gate") ||
                (p.startsWith("/api/") && (req.query.token || req.headers.authorization)) ||
                (req.headers["x-exocore-internal"] === internalToken_1.INTERNAL_TOKEN))
                return next();
            const config = readDevs();
            // No config yet → send to gate (setup mode)
            if (!config) {
                if (p.startsWith("/api/"))
                    return res.status(401).json({ error: "not_configured", gate: "/exocore/dev-gate" });
                return res.redirect("/exocore/dev-gate?next=" + encodeURIComponent(req.originalUrl));
            }
            // Verify session cookie
            const token = parseCookie(req, "exo_dev_session");
            if (token === makeToken(config.user, config.pass))
                return next();
            // Not authenticated
            if (p.startsWith("/api/"))
                return res.status(401).json({ error: "unauthorized", gate: "/exocore/dev-gate" });
            return res.redirect("/exocore/dev-gate?next=" + encodeURIComponent(req.originalUrl));
        });
    }
    setupBaseMiddleware() {
        this.app.set("trust proxy", 1);
        this.app.set("json spaces", 2);
        this.app.disable("x-powered-by");
        this.app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
        this.app.use((0, cors_1.default)({ origin: true, credentials: true }));
        this.app.use(express_1.default.json({ limit: "1mb" }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: "1mb" }));
        this.app.use((0, compression_1.default)());
        this.app.use((0, morgan_1.default)("dev"));
    }
    setupRoutes() {
        this.app.get("/", (_req, res) => {
            res.redirect("/exocore");
        });
        // Dev panel gate: protect all /exocore/api/* except /exocore/api/dev-access/*.
        // If the panel is initialized, the caller must present a valid Authorization
        // bearer token from the panel session. This prevents bypassing the UI gate
        // by hitting the API directly.
        // Panel-gate disabled: the app uses a single user-account auth system
        // (login/register/dashboard). The dev-panel session has been removed
        // from the UI flow, so /exocore/api/* is no longer dual-gated.
        // Each route is responsible for its own auth (e.g. /auth/* uses the
        // user token; editor routes accept a token query param).
        this.app.use("/exocore/api", (_req, _res, next) => next());
        this.app.use("/exocore/api", routes_1.default);
        const settingsPath = path_1.default.join(APP_ROOT, "settings.json");
        /* Canonicalise settings on read AND write so the file only ever
         * contains ONE theme key (`theme`). The user's request:
         * "isahin muna lang sana" — a single source of truth instead of
         * having both `theme` and `editorTheme` drift apart. We keep
         * accepting `editorTheme` as input for back-compat (older clients
         * still POST it) but the on-disk file always normalises to
         * `theme`. */
        const canonicaliseSettings = (raw) => {
            const out = { ...raw };
            // Promote legacy `editorTheme` into `theme` if `theme` missing.
            if (!out.theme && out.editorTheme)
                out.theme = out.editorTheme;
            // Drop the redundant duplicate so the file stays clean.
            if ("editorTheme" in out)
                delete out.editorTheme;
            return out;
        };
        this.app.get("/exocore/settings.json", (_req, res) => {
            try {
                let parsed = { theme: "modern" };
                if (fs_1.default.existsSync(settingsPath)) {
                    parsed = JSON.parse(fs_1.default.readFileSync(settingsPath, "utf-8"));
                }
                const cleaned = canonicaliseSettings(parsed);
                // Lazy migration: rewrite the file the first time we see
                // a duplicate `editorTheme` so it sticks.
                if (JSON.stringify(parsed) !== JSON.stringify(cleaned)) {
                    fs_1.default.writeFileSync(settingsPath, JSON.stringify(cleaned, null, 4));
                }
                res.setHeader("Content-Type", "application/json");
                res.send(JSON.stringify(cleaned, null, 4));
            }
            catch {
                res.status(500).json({ error: "failed_to_read_settings" });
            }
        });
        this.app.post("/exocore/api/settings", (req, res) => {
            try {
                let currentSettings = {};
                if (fs_1.default.existsSync(settingsPath)) {
                    currentSettings = JSON.parse(fs_1.default.readFileSync(settingsPath, "utf-8"));
                }
                const merged = canonicaliseSettings({ ...currentSettings, ...req.body });
                fs_1.default.writeFileSync(settingsPath, JSON.stringify(merged, null, 4));
                res.json({ success: true, settings: merged });
            }
            catch {
                res.status(500).json({ error: "failed_to_save_settings" });
            }
        });
        /* Recently-opened projects, persisted in settings.json under
         * `recentProjects`: [{ id, ts }] — newest first, capped to 50.
         * The dashboard reads this list to sort project tiles
         * recent-first, and projects.ts deleteProject prunes its entry
         * so deleted projects don't haunt the order.
         *
         * The user mentioned hiding settings.json by renaming it to
         * `ws-pack` — we deliberately did NOT rename: too many places
         * still reference settings.json across the app, and the rename
         * would be a multi-file refactor with no behavioural payoff.
         * Mentioning here so the next reader knows it was a conscious
         * decision, not an oversight. */
        /* ── Version API (Item 17) ──────────────────────────────── */
        this.app.get("/exocore/api/version", (_req, res) => {
            try {
                const pkgPath = path_1.default.join(process.cwd(), "package.json");
                const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, "utf-8"));
                res.json({ version: pkg.version || "4.0.0", home: pkg.home || "" });
            }
            catch {
                res.json({ version: "4.0.0", home: "Exocore v4.0.0 · Modern Engine" });
            }
        });
        /* ── VNC API (Item 15) ──────────────────────────────────── */
        this.app.post("/exocore/api/vnc/start", (_req, res) => {
            try {
                if (_vnc.xvfb && _vnc.xvfb.exitCode === null) {
                    return res.json({ ok: true, already: true });
                }
                _vnc.xvfb = (0, child_process_1.spawn)("Xvfb", [":99", "-screen", "0", "1280x800x24"], {
                    stdio: "ignore",
                    detached: true,
                    env: { ...process.env },
                });
                _vnc.xvfb.unref();
                setTimeout(() => {
                    _vnc.x11vnc = (0, child_process_1.spawn)("x11vnc", [
                        "-display", ":99",
                        "-nopw", "-forever", "-shared",
                        "-rfbport", "5900",
                        "-noxdamage", "-bg",
                    ], {
                        stdio: "ignore",
                        detached: true,
                        env: { ...process.env, DISPLAY: ":99" },
                    });
                    _vnc.x11vnc.unref();
                    // WebSocket bridge is handled by the main server
                    // upgrade handler at /exocore/api/vnc/ws (index.ts).
                }, 900);
                res.json({ ok: true });
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                res.status(500).json({ ok: false, error: msg });
            }
        });
        this.app.post("/exocore/api/vnc/stop", (_req, res) => {
            try {
                if (_vnc.x11vnc) {
                    try {
                        _vnc.x11vnc.kill("SIGTERM");
                    }
                    catch { }
                    _vnc.x11vnc = undefined;
                }
                if (_vnc.xvfb) {
                    try {
                        _vnc.xvfb.kill("SIGTERM");
                    }
                    catch { }
                    _vnc.xvfb = undefined;
                }
                res.json({ ok: true });
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                res.status(500).json({ ok: false, error: msg });
            }
        });
        this.app.get("/exocore/api/vnc/status", (_req, res) => {
            res.json({ running: Boolean(_vnc.xvfb && _vnc.xvfb.exitCode === null) });
        });
        this.app.post("/exocore/api/recent-project", (req, res) => {
            try {
                const projectId = String((req.body && req.body.projectId) || "").trim();
                if (!projectId)
                    return res.status(400).json({ error: "missing_projectId" });
                let current = {};
                if (fs_1.default.existsSync(settingsPath)) {
                    current = JSON.parse(fs_1.default.readFileSync(settingsPath, "utf-8"));
                }
                const prevList = Array.isArray(current.recentProjects)
                    ? current.recentProjects
                    : [];
                const filtered = prevList.filter((entry) => entry && entry.id && entry.id !== projectId);
                filtered.unshift({ id: projectId, ts: Date.now() });
                const trimmed = filtered.slice(0, 50);
                const merged = canonicaliseSettings({ ...current, recentProjects: trimmed });
                fs_1.default.writeFileSync(settingsPath, JSON.stringify(merged, null, 4));
                res.json({ success: true, recentProjects: trimmed });
            }
            catch {
                res.status(500).json({ error: "failed_to_record_recent" });
            }
        });
        // ---------------------------------------------------------------
        // Static (vanilla HTML) pages — Phase 3 of slim-down work.
        // Each converted page lives in static-pages/ as a self-contained
        // HTML file (no React, no bundler). Routes registered here take
        // priority over the React SPA fallback below, so as we migrate
        // pages one by one we just add another route here.
        // ---------------------------------------------------------------
        const staticPagesPath = path_1.default.join(APP_ROOT, "static-pages");
        // `redirect: false` — without this, express.static would 301
        // /exocore/dashboard → /exocore/dashboard/ (because the path
        // matches a directory), forcing a wasted round-trip before our
        // explicit STATIC_ROUTES entry below could serve the HTML.
        // Disable browser caching for static-pages assets so iterative edits to
        // the vanilla editor (HTML/JS/CSS under static-pages/editor/) take
        // effect immediately on reload. Without this, mobile browsers in
        // particular hold on to stale .html and never pick up new boot logic.
        this.app.use("/exocore", (req, res, next) => {
            if (req.method === "GET" || req.method === "HEAD") {
                res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
                res.setHeader("Pragma", "no-cache");
                res.setHeader("Expires", "0");
            }
            next();
        });
        this.app.use("/exocore", express_1.default.static(staticPagesPath, { redirect: false, etag: false, lastModified: false, cacheControl: false }));
        this.app.get(["/exocore", "/exocore/"], (_req, res) => {
            res.sendFile(path_1.default.join(staticPagesPath, "home.html"));
        });
        // Clean URLs (no `.html` suffix) for migrated pages.
        //
        // Files in `static-pages/` are organised by category folder
        // (`auth/`, etc.) so the directory stays scannable as more
        // pages graduate off React. Each entry maps a route →
        // file path *relative to* `static-pages/`. To add a new
        // vanilla page: drop the HTML in the right subfolder, add
        // an entry here, and (if it needs the backend) add a
        // matching route under `routes/<category>/`.
        const STATIC_ROUTES = [
            // Developer gate — unprotected, must be first
            [["/exocore/dev-gate", "/exocore/dev-gate/"], "dev-gate.html"],
            // Phase 3.B
            [["/exocore/login", "/exocore/login/"], "auth/login.html"],
            // Phase 3.C
            [["/exocore/register", "/exocore/register/"], "auth/register.html"],
            // Phase 3.D
            [["/exocore/forgot", "/exocore/forgot/"], "auth/forgot.html"],
            // Phase 3.E
            [["/exocore/verify-pending", "/exocore/verify-pending/"], "auth/verify-pending.html"],
            // Phase 3.F
            [["/exocore/auth/callback", "/exocore/auth/callback/"], "auth/callback.html"],
            // Phase 3.G — dashboard (post-login workspace)
            [["/exocore/dashboard", "/exocore/dashboard/"], "dashboard/dashboard.html"],
            // Phase 3.I — leaderboard (now lives in its own subfolder)
            [["/exocore/leaderboard", "/exocore/leaderboard/"], "leaderboard/leaderboard.html"],
            // Phase 3.J (initial slice) — editor shell. The HTML pulls
            // its own CSS + JS modules from /exocore/editor/{styles,scripts}/…
            // which are served by the express.static mount above.
            [["/exocore/editor", "/exocore/editor/"], "editor/editor.html"],
            // Phase 3.K — cloud manager (Google Drive backups). Was an
            // inline modal in the React Dashboard; now its own page so
            // the dashboard quick-action can deep-link to it.
            [["/exocore/cloud", "/exocore/cloud/"], "cloud/cloud.html"],
            // Phase 3.L — community feed (lifted out of the dashboard
            // home view so it can have its own URL, its own composer
            // and a fresh, randomly-shuffled order on every visit).
            [["/exocore/feed", "/exocore/feed/"], "feed/feed.html"],
            // Offline fallback page (item 20)
            [["/exocore/offline", "/exocore/offline/"], "offline.html"],
        ];
        for (const [routes, file] of STATIC_ROUTES) {
            this.app.get(routes, (_req, res) => {
                res.sendFile(path_1.default.join(staticPagesPath, file));
            });
        }
        // Phase 3.H — parameterised profile route. Pattern lives outside
        // STATIC_ROUTES because it carries `:username`. The HTML reads the
        // username straight from `location.pathname` at runtime.
        this.app.get(["/exocore/u/:username", "/exocore/u/:username/"], (_req, res) => {
            res.sendFile(path_1.default.join(staticPagesPath, "profile/profile.html"));
        });
        // ── Install scripts (item 20/21 — offline installers) ──────────
        // Served from the project root (not static-pages/) so they are
        // downloadable even before the user logs in.
        const rootDir = path_1.default.join(APP_ROOT, "..");
        const installScripts = [
            ["/linux.sh", "linux.sh", "text/plain; charset=utf-8"],
            ["/termux.sh", "termux.sh", "text/plain; charset=utf-8"],
            ["/window.bat", "window.bat", "text/plain; charset=utf-8"],
        ];
        for (const [route, file, ct] of installScripts) {
            this.app.get(route, (_req, res) => {
                res.setHeader("Content-Type", ct);
                res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
                res.sendFile(path_1.default.join(rootDir, file));
            });
        }
        const distPath = path_1.default.join(APP_ROOT, "dist");
        this.app.use("/exocore", express_1.default.static(distPath));
        this.app.use((req, res, next) => {
            if (req.method === "GET" &&
                req.path.startsWith("/exocore") &&
                !req.path.startsWith("/exocore/api") &&
                !req.path.startsWith("/exocore/port/")) {
                // Fall back to the React SPA's index.html for any not-yet-
                // migrated route. If the SPA build is missing (still being
                // ported), return a clear 503 instead of an opaque 500.
                const spaIndex = path_1.default.join(distPath, "index.html");
                if (fs_1.default.existsSync(spaIndex)) {
                    res.sendFile(spaIndex);
                }
                else {
                    res.status(503).type("text/plain").send("This page has not yet been migrated to the static panel.\n" +
                        "Path: " + req.path + "\n" +
                        "Tip: visit /exocore for the home page.");
                }
            }
            else {
                next();
            }
        });
    }
    setupProxyRoute() {
        /* ── Shared HTML error page for all proxy failures ────────────── */
        function proxyErrorPage(opts) {
            return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title} — Exocore</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#0c0c0e;color:#e2e8f0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  body{display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:480px;width:100%;text-align:center}
  .icon{font-size:56px;line-height:1;margin-bottom:20px;filter:drop-shadow(0 0 24px rgba(255,255,255,.08))}
  .code{display:inline-block;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
        color:#71717a;background:#18181b;border:1px solid #27272a;border-radius:6px;
        padding:3px 10px;margin-bottom:14px}
  h1{font-size:26px;font-weight:700;color:#f4f4f5;margin-bottom:12px;letter-spacing:-.3px}
  .body{font-size:15px;color:#a1a1aa;line-height:1.6;margin-bottom:10px}
  .body code{background:#1c1c1f;border:1px solid #2d2d31;color:#e879f9;
              padding:2px 7px;border-radius:5px;font-size:13px}
  .hint{font-size:13px;color:#71717a;line-height:1.55;margin-top:8px}
  .hint strong{color:#a1a1aa}
  .divider{width:40px;height:2px;background:#27272a;border-radius:2px;margin:20px auto}
  .reload{display:inline-flex;align-items:center;gap:7px;margin-top:22px;padding:9px 20px;
          font-size:13px;font-weight:600;color:#d4d4d8;
          background:#1c1c1f;border:1px solid #3f3f46;border-radius:8px;
          cursor:pointer;text-decoration:none;transition:background .15s,border-color .15s}
  .reload:hover{background:#27272a;border-color:#52525b}
  .reload svg{width:14px;height:14px;flex-shrink:0}
</style>
</head>
<body>
<div class="card">
  <div class="icon">${opts.icon}</div>
  <div class="code">${opts.code}</div>
  <h1>${opts.heading}</h1>
  <p class="body">${opts.body}</p>
  <div class="divider"></div>
  <p class="hint">${opts.hint}</p>
  <a class="reload" href="javascript:location.reload(true)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
    Retry
  </a>
</div>
</body>
</html>`;
        }
        const UNSAFE_HEADERS = new Set([
            "host", "connection", "keep-alive",
            "proxy-authenticate", "proxy-authorization",
            "te", "trailer", "transfer-encoding", "upgrade",
        ]);
        const doProxy = (req, res, port, targetPath) => {
            const cleanHeaders = {};
            for (const [key, value] of Object.entries(req.headers)) {
                if (UNSAFE_HEADERS.has(key.toLowerCase()))
                    continue;
                cleanHeaders[key] = Array.isArray(value) ? value[0] : value;
            }
            cleanHeaders["host"] = `localhost:${port}`;
            const options = {
                hostname: "127.0.0.1",
                port,
                path: targetPath,
                method: req.method,
                headers: cleanHeaders,
            };
            const proxyReq = http_1.default.request(options, (proxyRes) => {
                const statusCode = proxyRes.statusCode ?? 200;
                const isRedirect = statusCode >= 300 && statusCode < 400;
                if (isRedirect) {
                    let location = proxyRes.headers.location || '/';
                    try {
                        const parsed = new URL(location, `http://localhost:${port}`);
                        const isLocal = parsed.hostname === 'localhost' ||
                            parsed.hostname === '127.0.0.1' ||
                            parsed.hostname === '0.0.0.0' ||
                            parsed.port === String(port);
                        if (isLocal) {
                            location = parsed.pathname + parsed.search + parsed.hash;
                        }
                    }
                    catch { }
                    if (location.startsWith('/') && !location.startsWith(`/exocore/port/${port}/`)) {
                        location = `/exocore/port/${port}${location}`;
                    }
                    const currentPath = req.path;
                    const locationPath = location.split('?')[0];
                    if (locationPath === currentPath || locationPath === currentPath + '/') {
                        if (!res.headersSent) {
                            res.setHeader("Content-Type", "text/html");
                            res.status(200).send(`
                    <html>
                    <head>
                    <title>Connecting...</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    </head>
                    <body style="background: #111; color: #aaa; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                    <p>Establishing connection...</p>
                    <script>
                    setTimeout(() => {
                        window.location.reload(true);
                    }, 500);
                    </script>
                    </body>
                    </html>
                    `);
                        }
                        return;
                    }
                    res.writeHead(statusCode, { ...proxyRes.headers, location });
                    res.end();
                    return;
                }
                const contentType = proxyRes.headers['content-type'] || '';
                if (contentType.includes('text/html')) {
                    const { ['content-length']: _cl, ['transfer-encoding']: _te, ...safeHeaders } = proxyRes.headers;
                    res.writeHead(statusCode, safeHeaders);
                    let html = '';
                    proxyRes.on('data', (chunk) => { html += chunk.toString(); });
                    proxyRes.on('end', () => {
                        const base = `<base href="/exocore/port/${port}/">`;
                        const patched = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}${base}`);
                        res.end(patched.includes(base) ? patched : base + patched);
                    });
                }
                else {
                    res.writeHead(statusCode, proxyRes.headers);
                    proxyRes.pipe(res, { end: true });
                }
            });
            proxyReq.on("error", () => {
                if (!res.headersSent) {
                    res.status(502).type("html").send(proxyErrorPage({
                        title: "Project Offline",
                        code: "502",
                        heading: "Can't reach your project",
                        body: `Nothing is listening on port <code>${port}</code> right now.`,
                        hint: "Hit <strong>Run</strong> in the editor to start it, or check the Console for crash output.",
                        icon: "🔌",
                    }));
                }
            });
            if (req.method !== "GET" && req.method !== "HEAD") {
                req.pipe(proxyReq, { end: true });
            }
            else {
                proxyReq.end();
            }
        };
        this.app.all(/^\/exocore\/port\/(\d+)(\/.*)?$/, (req, res) => {
            const rawPort = req.params[0];
            const subPath = req.params[1];
            if (!rawPort || !/^\d+$/.test(rawPort)) {
                res.status(400).type("html").send(proxyErrorPage({
                    title: "Bad Request",
                    code: "400",
                    heading: "Invalid port",
                    body: `Port must be a number, got <code>${rawPort || "(empty)"}</code>.`,
                    hint: "Check the URL — it should look like <strong>/exocore/port/3000/</strong>.",
                    icon: "🔢",
                }));
                return;
            }
            const port = parseInt(rawPort, 10);
            if (port < 1 || port > 65535) {
                res.status(400).type("html").send(proxyErrorPage({
                    title: "Bad Request",
                    code: "400",
                    heading: "Port out of range",
                    body: `Port <code>${port}</code> is outside the valid range of 1 – 65535.`,
                    hint: "Open <strong>system.exo</strong> and set <strong>runtime.port</strong> to a valid port like <strong>3000</strong> or <strong>8080</strong>.",
                    icon: "🚫",
                }));
                return;
            }
            // Refuse to proxy to ourselves. The panel listens on `serverPort`,
            // so a request for /exocore/port/<serverPort>/ would loop straight
            // back to Exocore — we'd grab whatever 302 the panel emits (e.g.
            // `/` → `/exocore`), rewrite it under /exocore/port/<port>, and
            // the browser would pound the proxy until it gave up. Show the
            // user a helpful error instead of a redirect loop.
            const serverPort = Number(process.env.PORT || 5000);
            if (port === serverPort) {
                res.status(409).type("html").send(proxyErrorPage({
                    title: "Port Collision",
                    code: "409",
                    heading: "Port collision detected",
                    body: `Port <code>${port}</code> is the Exocore panel itself — proxying it would loop forever.`,
                    hint: `Open <strong>system.exo</strong> and set <code>runtime.port</code> to a different number like <strong>3000</strong>, <strong>8080</strong>, or <strong>4000</strong>. Also make sure your code binds to <code>process.env.PORT</code> instead of hard-coding <strong>${port}</strong>.`,
                    icon: "🔁",
                }));
                return;
            }
            if (!subPath) {
                res.redirect(`/exocore/port/${rawPort}/`);
                return;
            }
            const queryStr = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
            const targetPath = subPath + queryStr;
            doProxy(req, res, port, targetPath);
        });
    }
    setupErrorHandling() {
        this.app.use((err, _req, res, next) => {
            console.error("🔥 Server Error:", err);
            if (res.headersSent)
                return next(err);
            res.status(500).json({ error: "internal_server_error" });
        });
    }
    getApp() {
        return this.app;
    }
}
exports.default = App;
