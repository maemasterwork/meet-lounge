// The app can notify by itself (no server): the settings "test notification" shows a system notification through the service worker.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const base = process.env.BASE || 'http://localhost:4173/'
const FLAT = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'ml-flat', value: '1' }] }] }
const b = await chromium.launch()
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const ctx = await b.newContext({ storageState: FLAT, viewport: { width: 1280, height: 800 }})
const p = await ctx.newPage()
await p.addInitScript(() => {
  window.__n = []
  Object.defineProperty(Notification, 'permission', { get: () => 'granted' })   // headless Chromium cannot grant it
  const orig = ServiceWorkerRegistration.prototype.showNotification
  ServiceWorkerRegistration.prototype.showNotification = function (t, o) { window.__n.push([t, o && o.body]); return Promise.resolve() }   // the real call is refused in headless Chromium
})
await p.goto(base + '#/')
await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.getRegistration().then((r) => !!r), null, { timeout: 20000 }).catch(() => {})
await p.locator('button[data-lang]').click()
await p.locator('.pop .it', { hasText: /test notification|اعلان آزمایشی/ }).click()
await p.waitForFunction(() => window.__n.length > 0, null, { timeout: 15000 }).catch(() => {})
const n = await p.evaluate(() => window.__n)
ok(n.length === 1 && n[0][0].length > 0, 'test button shows a system notification: ' + JSON.stringify(n))
await b.close(); process.exit(fails ? 1 : 0)
