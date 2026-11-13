// PWA + 3D checks (the push handler itself is unit-tested in src/lib/sw.test.ts) on the built app. Needs: npm run build; the script adds a test model to dist/ and restores it.
// Run:  npx vite preview --port 4173 &   then   node e2e/pwa.mjs
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }
const idxPath = 'dist/models/index.json', orig = readFileSync(idxPath, 'utf8')
execFileSync('node', ['scripts/make-test-glb.mjs', 'dist/models/latte.glb'])
writeFileSync(idxPath, JSON.stringify({ latte: 'latte.glb', bogus: '../evil.glb' }))
try {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => localStorage.setItem('ml-ui', JSON.stringify({ state: { lang: 'en', theme: null, notifyOn: true, favorites: [], registered: [] }, version: 1 })))

  // manifest and icons
  await page.goto(BASE + '#menu'); await page.waitForSelector('.bigg')
  const mf = await (await ctx.request.get(BASE + 'manifest.webmanifest')).json()
  for (const i of mf.icons) { const r = await ctx.request.get(BASE + i.src); if (!r.ok()) fail('icon missing ' + i.src) }
  if (mf.display !== 'standalone' || !mf.icons.some((i) => i.purpose === 'maskable')) fail('manifest incomplete')

  // service worker takes control and the shell works offline
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload(); await page.waitForSelector('.bigg')
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) fail('service worker not controlling the page')
  await ctx.setOffline(true)
  await page.reload(); await page.waitForSelector('.bigg', { timeout: 8000 }).catch(() => fail('offline reload failed'))
  await ctx.setOffline(false)

  // 3D: latte has a model, espresso does not; bad manifest entries are ignored
  await page.waitForFunction(() => window.MeetLounge && window.MeetLounge.assets.models.latte, null, { timeout: 5000 }).catch(() => fail('manifest not loaded'))
  if (await page.evaluate(() => Object.keys(window.MeetLounge.assets.models).includes('bogus'))) fail('unsafe model path accepted')
  await page.click('.th[aria-label="Latte"]')
  await page.waitForSelector('model-viewer', { timeout: 15000 }).catch(() => fail('model-viewer element missing'))
  const loaded = await page.evaluate(() => new Promise((res) => { const m = document.querySelector('model-viewer'); if (m.loaded) return res(true); m.addEventListener('load', () => res(true)); m.addEventListener('error', () => res(false)); setTimeout(() => res('timeout'), 15000) }))
  if (loaded !== true) fail('model did not load: ' + loaded)
  await page.click('.th[aria-label="Espresso"]')
  await page.waitForTimeout(300)
  if (await page.locator('model-viewer').count()) fail('model shown for an item without one')
  if (errors.length) fail('page errors: ' + errors.join(' | '))
  await browser.close()
} finally { writeFileSync(idxPath, orig) }
if (!process.exitCode) console.log('PWA PASS')
