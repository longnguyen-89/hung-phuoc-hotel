#!/usr/bin/env node
// Drives a headless Chrome via CDP over WebSocket to capture screenshots
// of every feature page. No puppeteer dependency — uses raw CDP.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";

const CHROME = "/Users/xnohat/.cache/puppeteer/chrome/mac_arm-146.0.7680.31/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const CDP_PORT = 9444;
const PROFILE = "/tmp/mini-crm-cdp-profile";
const OUT_DIR = "/Users/xnohat/personal_mini_crm/docs/screenshots";
const APP = "http://localhost:3000";

rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log("→ launching Chrome for Testing…");
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate",
    "--remote-allow-origins=*",
  ],
  { stdio: ["ignore", "pipe", "pipe"] }
);
chrome.stderr.on("data", (d) => process.stderr.write(`  [chrome] ${d}`));

async function getBrowserWs() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await wait(500);
  }
  throw new Error("Chrome CDP didn't come up");
}

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.sessions = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    this.ws.send(JSON.stringify(payload));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  close() {
    this.ws.close();
  }
}

async function withPage(cdp, fn) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p = {}) => cdp.send(m, p, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  try {
    return await fn({ send, targetId });
  } finally {
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

async function navigate(send, url) {
  await send("Page.navigate", { url });
  await new Promise((res) => {
    const handler = (e) => {
      // listen via raw ws; too complex — just sleep until DOMContentLoaded heuristic
    };
    setTimeout(res, 1800);
  });
  // Wait an extra bit for React hydration + fetches
  await wait(1200);
}

async function screenshot(send, filename, { fullPage = true, mobile = false } = {}) {
  if (mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: "portraitPrimary", angle: 0 },
    });
  } else {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: fullPage,
  });
  const path = `${OUT_DIR}/${filename}`;
  writeFileSync(path, Buffer.from(data, "base64"));
  console.log(`  ✓ ${filename}`);
}

async function setCookie(send, name, value) {
  await send("Network.setCookie", {
    name,
    value,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
  });
}

async function cleanerLogin(phone) {
  const r = await fetch(`${APP}/api/cleaner/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const setCookie = r.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/cleaner_uid=([^;]+)/);
  if (!m) throw new Error(`cleaner login failed: ${r.status} ${await r.text()}`);
  return m[1];
}

try {
  const wsUrl = await getBrowserWs();
  console.log("→ connected CDP:", wsUrl);
  const cdp = new CDP(wsUrl);
  await cdp.connect();

  const OWNER_PAGES = [
    ["dashboard", "/dashboard"],
    ["rooms", "/rooms"],
    ["bookings", "/bookings"],
    ["tasks", "/tasks"],
    ["staff", "/staff"],
    ["payroll", "/payroll"],
  ];

  console.log("→ capturing Owner Dashboard pages…");
  for (const [name, path] of OWNER_PAGES) {
    await withPage(cdp, async ({ send }) => {
      await navigate(send, `${APP}${path}`);
      await screenshot(send, `owner-${name}.png`);
    });
  }

  console.log("→ logging in cleaner Cô Mai (0900000002)…");
  const cleanerUid = await cleanerLogin("0900000002");

  const CLEANER_PAGES = [
    ["login", "/cleaner/login", false],
    ["tasks", "/cleaner/tasks", true],
    ["earnings", "/cleaner/earnings", true],
    ["profile", "/cleaner/profile", true],
  ];

  console.log("→ capturing Cleaner PWA pages…");
  for (const [name, path, needAuth] of CLEANER_PAGES) {
    await withPage(cdp, async ({ send }) => {
      if (needAuth) await setCookie(send, "cleaner_uid", cleanerUid);
      await navigate(send, `${APP}${path}`);
      await screenshot(send, `cleaner-${name}.png`, { mobile: true });
    });
  }

  // Task detail screenshot (need an assigned task for Cô Mai)
  console.log("→ trying cleaner task detail…");
  const res = await fetch(`${APP}/api/tasks?cleaner=${cleanerUid}`).catch(() => null);
  // fallback: just list first task directly via page
  await withPage(cdp, async ({ send }) => {
    await setCookie(send, "cleaner_uid", cleanerUid);
    await navigate(send, `${APP}/cleaner/tasks`);
    const { result } = await send("Runtime.evaluate", {
      expression: `document.querySelector('a[href^="/cleaner/tasks/"]')?.getAttribute('href') ?? ''`,
      returnByValue: true,
    });
    const href = result.value;
    if (href) {
      await navigate(send, `${APP}${href}`);
      await screenshot(send, `cleaner-task-detail.png`, { mobile: true });
    } else {
      console.log("  (no assigned task found for Cô Mai — skip detail)");
    }
  });

  cdp.close();
  console.log("→ done.");
} catch (e) {
  console.error("✗", e);
  process.exitCode = 1;
} finally {
  chrome.kill("SIGTERM");
}
