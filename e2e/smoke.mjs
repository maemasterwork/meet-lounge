// Smoke test: add an item, switch to delivery, place the order, see it in Profile.
// Run:  npm run build && npx vite preview --port 4173 &   then   node e2e/smoke.mjs
// Needs the `playwright` package and a Chromium (npm i -D playwright && npx playwright install chromium).
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }
const browser = await chromium.launch()
for (const lang of ['fa', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_/.test(m.text())) errors.push(m.text()) })
  await page.addInitScript((l) => localStorage.setItem('ml-ui', JSON.stringify({ state: { lang: l, theme: null, notifyOn: true, favorites: [], registered: [] }, version: 1 })), lang)
  await page.goto(BASE + '#menu')
  await page.waitForSelector('.bigg')
  const noScroll = await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)
  if (!noScroll) fail(`${lang}: page scrolls on the menu`)
  // pick the cappuccino from the strip, add 2
  await page.click('.th[aria-label]:nth-child(3)')
  await page.click('.step button:last-child')
  await page.click('.buy .btn:not(.gold)')
  await page.waitForSelector('.toast')
  // bag
  await page.click('#tabs button:nth-child(4)')
  await page.waitForSelector('.seg')
  await page.click('.seg button:nth-child(3)') // delivery
  await page.click('.two .btn:not(.ghost):not(.sm)') // place without address
  if (!(await page.$('.err[role="alert"]'))) fail(`${lang}: no address error`)
  await page.fill('textarea', 'Valiasr St, No. 1')
  const total = await page.textContent('.sum .tot')
  await page.click('.two .btn:not(.ghost):not(.sm)')
  await page.waitForSelector('.stepper')
  const card = await page.textContent('.row')
  if (!card) fail(`${lang}: order missing in profile`)
  // advance the order in admin and check the coin arrives
  await page.goto(BASE + '#admin')
  await page.waitForSelector('.board')
  for (let i = 0; i < 4; i++) { const b = await page.$('.ocard.mine .btn:not(.ghost)'); if (!b) break; await b.click(); await page.waitForTimeout(80) }
  await page.goto(BASE + '#me')
  await page.waitForSelector('.stepper')
  const coins = await page.textContent('#coinPill')
  console.log(lang, 'ok; total:', total?.trim(), '| coin pill:', coins?.trim(), '| order card:', card.slice(0, 60).replace(/\s+/g, ' '))
  if (errors.length) fail(`${lang}: console errors: ${errors.join(' | ')}`)
  await ctx.close()
}
await browser.close()
if (!process.exitCode) console.log('SMOKE PASS')
