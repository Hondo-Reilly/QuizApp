import { randomBytes } from "node:crypto";
import { imageContentType, imageRefs } from "../../shared/quizContent";
import { readQuizAsset } from "./quizAssets";
import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  mobileBodyWithinLimit,
  mobileJsonContentType,
  mobileOriginAllowed,
  mobileTokensMatch,
} from "./mobileAccess";
import { IpcChannels } from "../../shared/ipcChannels";
import {
  applyMobilePatch,
  createMobileSession,
  isMobilePatch,
  mobilePatchIssue,
  type MobilePatch,
  type MobileSession,
  type MobileSessionSeed,
} from "../../shared/mobile";

const clients = new Set<http.ServerResponse>();

let server: http.Server | null = null;
let session: MobileSession | null = null;
let sessionToken: string | null = null;
let publicUrl: string | null = null;
let starting: Promise<string> | null = null;
let generation = 0;
let cancelStart: (() => void) | null = null;
let chain: Promise<void> = Promise.resolve();
let keepAlive: ReturnType<typeof setInterval> | null = null;

export function mobileServerUrl(): string | null {
  return publicUrl;
}

export function startMobileServer(seed: MobileSessionSeed): Promise<string> {
  if (publicUrl) return Promise.resolve(publicUrl);
  if (starting) return starting;

  const current = ++generation;
  session = createMobileSession(seed);
  sessionToken = randomBytes(24).toString("base64url");
  const created = http.createServer((req, res) => {
    void handleRequest(req, res).catch(() => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Something went wrong." });
      }
    });
  });
  server = created;

  const pending = new Promise<string>((resolve, reject) => {
    cancelStart = () => reject(new Error("Mobile mode stopped."));
    created.once("error", (error) => {
      if (generation !== current) return;
      session = null;
      sessionToken = null;
      server = null;
      publicUrl = null;
      reject(error);
    });
    created.listen(0, "0.0.0.0", () => {
      if (generation !== current) {
        reject(new Error("Mobile mode stopped."));
        return;
      }
      const address = created.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const url = `http://${lanAddress()}:${port}/?token=${encodeURIComponent(sessionToken ?? "")}`;
      publicUrl = url;
      keepAlive = setInterval(() => {
        for (const client of clients) client.write(": ping\n\n");
      }, 15000);
      resolve(url);
    });
  }).finally(() => {
    starting = null;
    cancelStart = null;
  });
  starting = pending;
  return pending;
}

export async function stopMobileServer(): Promise<void> {
  if (!server) return;
  generation += 1;
  cancelStart?.();
  cancelStart = null;
  const reason = session?.finished ? "finished" : "stopped";
  const payload = `event: end\ndata: ${JSON.stringify({ reason })}\n\n`;
  for (const client of clients) {
    client.write(payload);
    client.end();
  }
  clients.clear();
  if (keepAlive) clearInterval(keepAlive);
  keepAlive = null;
  const closing = server;
  server = null;
  session = null;
  sessionToken = null;
  publicUrl = null;
  await new Promise<void>((resolve) => closing.close(() => resolve()));
}

export function patchMobileSession(
  patch: MobilePatch,
): Promise<MobileSession | null> {
  const run = chain.then(() => {
    if (!session || mobilePatchIssue(session, patch)) return null;
    const next = applyMobilePatch(session, patch);
    if (next !== session) {
      session = next;
      broadcast(next);
    }
    return session;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function notifyPhoneConnected(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IpcChannels.mobileConnected);
    }
  }
}

function broadcast(next: MobileSession): void {
  const data = `data: ${JSON.stringify(next)}\n\n`;
  for (const client of clients) client.write(data);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IpcChannels.mobileSnapshot, next);
    }
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function allowMobileRequest(req: http.IncomingMessage, url: URL): boolean {
  if (!sessionToken) return false;
  if (
    !mobileOriginAllowed(headerValue(req.headers.origin), headerValue(req.headers.host))
  ) {
    return false;
  }
  return mobileTokensMatch(url.searchParams.get("token"), sessionToken);
}

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const guarded =
    url.pathname === "/session" || url.pathname === "/events";
  if (guarded && !allowMobileRequest(req, url)) {
    sendJson(res, 401, { error: "Mobile session was not authorized." });
    return;
  }
  if (req.method === "GET" && url.pathname === "/session") {
    if (session) notifyPhoneConnected();
    sendJson(res, session ? 200 : 404, session ?? { error: "Mobile mode is not running." });
    return;
  }
  if (req.method === "GET" && url.pathname === "/events") {
    if (!session) {
      sendJson(res, 404, { error: "Mobile mode is not running." });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify(session)}\n\n`);
    clients.add(res);
    notifyPhoneConnected();
    req.on("close", () => clients.delete(res));
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/asset/")) {
    await serveQuizAsset(req, res, url);
    return;
  }
  if (req.method === "POST" && url.pathname === "/session") {
    if (!session) {
      sendJson(res, 404, { error: "Mobile mode is not running." });
      return;
    }
    const contentType = headerValue(req.headers["content-type"]);
    if (!mobileJsonContentType(contentType)) {
      sendJson(res, 415, { error: "Expected JSON." });
      return;
    }
    const body = await readBody(req);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      sendJson(res, 400, { error: "Invalid JSON." });
      return;
    }
    if (!isMobilePatch(parsed)) {
      sendJson(res, 400, { error: "Invalid update." });
      return;
    }
    const issue = session ? mobilePatchIssue(session, parsed) : "Mobile mode is not running.";
    if (issue) {
      sendJson(res, 400, { error: issue });
      return;
    }
    const next = await patchMobileSession(parsed);
    sendJson(res, 200, next);
    return;
  }
  if (req.method === "GET") {
    await servePage(req, res);
    return;
  }
  sendJson(res, 405, { error: "Method not allowed." });
}

async function serveQuizAsset(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<void> {
  if (!allowMobileRequest(req, url) || !session) {
    sendJson(res, 401, { error: "Mobile session was not authorized." });
    return;
  }
  let rel: string;
  try {
    rel = url.pathname.slice("/asset/".length).split("/").map(decodeURIComponent).join("/");
  } catch {
    sendJson(res, 400, { error: "Invalid image path." });
    return;
  }
  // Only images the running quiz references are served.
  if (!imageRefs(session.quiz).includes(rel)) {
    sendJson(res, 404, { error: "Not found." });
    return;
  }
  const data = await readQuizAsset(session.quiz.id, rel);
  if (!data) {
    sendJson(res, 404, { error: "Not found." });
    return;
  }
  res.writeHead(200, {
    "Content-Type": imageContentType(rel),
    "Content-Length": data.length,
    "Cache-Control": "no-store",
  });
  res.end(data);
}

async function servePage(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    proxyToVite(req, res, devServer);
    return;
  }
  await serveDist(req, res);
}

function proxyToVite(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  devServer: string,
): void {
  const incoming = new URL(req.url ?? "/", "http://127.0.0.1");
  const pathname = incoming.pathname === "/" ? "/mobile.html" : incoming.pathname;
  const target = new URL(`${pathname}${incoming.search}`, devServer);
  const headers = { ...req.headers, host: target.host };
  const upstream = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method: "GET",
      headers,
    },
    (proxied) => {
      res.writeHead(proxied.statusCode ?? 502, proxied.headers);
      proxied.pipe(res);
    },
  );
  upstream.on("error", () => {
    sendJson(res, 502, { error: "The quiz page is unavailable." });
  });
  upstream.end();
}

async function serveDist(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const incoming = new URL(req.url ?? "/", "http://127.0.0.1");
  const rel = incoming.pathname === "/" ? "mobile.html" : decodeURIComponent(incoming.pathname.replace(/^\/+/, ""));
  const root = path.resolve(app.getAppPath(), "dist");
  const file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, {
      "Content-Type": contentType(file),
      "Content-Length": data.length,
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "Not found." });
  }
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
    "Cache-Control": "no-store",
  });
  res.end(json);
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (!mobileBodyWithinLimit(size)) {
      throw new Error("Body too large.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function contentType(file: string): string {
  switch (path.extname(file)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function lanAddress(): string {
  const preferred: string[] = [];
  const fallback: string[] = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const net of list ?? []) {
      const family = String(net.family);
      if ((family !== "IPv4" && family !== "4") || net.internal) continue;
      if (net.address.startsWith("169.254.")) continue;
      const virtual = /^(utun|awdl|bridge|llw|vmnet|vboxnet)/.test(name);
      if (virtual) fallback.push(net.address);
      else preferred.push(net.address);
    }
  }
  return preferred[0] ?? fallback[0] ?? "127.0.0.1";
}
