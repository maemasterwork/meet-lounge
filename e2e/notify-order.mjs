// The app notifies by itself when an order becomes Ready, and when a new offer appears (no server involved).
import { createRequire } from 'node:module'
const FLAT = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'ml-flat', value: '1' }] }] }
const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const fail = (m) => { console.error('FAIL', m); process.exit(1) }
const b = await chromium.launch()
for (const mode of ['hidden', 'unfocused', 'visible']) {
  const page = await (await b.newContext({ storageState: FLAT, viewport: { width: 1440, height: 900 } })).newPage()
  await page.addInitScript((m) => {
    localStorage.setItem('ml-ui', JSON.stringify({ state: { lang: 'en', theme: null, notifyOn: true, favorites: [], registered: [] }, version: 1 }))
    window.__n = []
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' })
    ServiceWorkerRegistration.prototype.showNotification = function (t, o) { window.__n.push([t, o && o.body, o && o.tag]); return Promise.resolve() }
    if (m === 'hidden') Object.defineProperty(document, 'visibilityState', { get: () => 'hidden' })
    else document.hasFocus = () => false
  }, mode)
  page.on('pageerror', (e) => console.log('PAGEERR', String(e))); page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)) })
  await page.goto(BASE + '#menu'); await page.waitForSelector('.mgrid')
  await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => !!r), null, { timeout: 20000 }).catch(() => {})
  await page.click('.mc:nth-child(1) .plus'); await page.waitForSelector('.toast')
  await page.click('#tabs button:nth-child(4)'); await page.waitForSelector('.seg')
  await page.click('.checkout'); await page.waitForSelector('[data-testid=card-number]')
  await page.goto(BASE + '#admin'); await page.waitForSelector('.board')
  const nums = (await page.locator('.ocard').allInnerTexts()).map((x) => Number((x.match(/#(\d+)/) || [])[1])).filter(Boolean)
  const mine = page.locator('.ocard', { hasText: `#${Math.max(...nums)}` })
  for (let i = 0; i < 3; i++) { await mine.locator('.btn:not(.ghost):not(.danger)').first().click(); await page.waitForTimeout(300) }   // deposit, preparing, ready
  await page.waitForFunction(() => window.__n.length > 0, null, { timeout: 5000 }).catch(() => {})
  const n = await page.evaluate(() => window.__n)
  if (!n.some((x) => /ready|آماده/.test(x[0]))) fail(`${mode}: no "ready" notification, got ${JSON.stringify(n)}`)
  console.log(mode, 'ok', JSON.stringify(n))
}
await b.close(); console.log('NOTIFY-ORDER PASS')
