// Events page: calendar renders, a day shows its ticket, a seat can be saved, months navigate (EN and FA).
import { createRequire } from 'node:module'
// the other checks run on the flat artwork: software-rendered WebGL makes them minutes slower (stage3d.mjs covers the 3D scene)
const FLAT = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'ml-flat', value: '1' }] }] }
const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const fail = (m) => { console.error('FAIL', m); process.exit(1) }
const b = await chromium.launch()
for (const [lang, vp] of [['en', { width: 1440, height: 900 }], ['fa', { width: 1440, height: 900 }], ['en', { width: 390, height: 780 }]]) {
  const page = await (await b.newContext({ storageState: FLAT, viewport: vp })).newPage()
  await page.addInitScript((l) => localStorage.setItem('ml-ui', JSON.stringify({ state: { lang: l, theme: null, notifyOn: true, favorites: [], registered: [] }, version: 1 })), lang)
  await page.goto(BASE + '#events')
  await page.waitForSelector('.cg .cd')
  if ((await page.$$('.cg .cd')).length !== 42) fail('42 cells')
  if (!(await page.$('[data-testid=event-ticket]'))) fail('no ticket for the next event')
  const before = await page.textContent('.seats')
  await page.click('.btn.seat'); await page.waitForTimeout(100)
  const after = await page.textContent('.seats')
  if (before === after) fail(`${lang}: seats did not change`)
  const mon = await page.textContent('.mon')
  await page.click('.cnav:last-of-type'); await page.waitForTimeout(100)
  if ((await page.textContent('.mon')) === mon) fail(`${lang}: month did not change`)
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (sw > 1) fail(`${lang}: horizontal scroll`)
  await page.screenshot({ path: `/tmp/events-${lang}-${vp.width}.png` })
  console.log(lang, vp.width, 'ok', mon.trim(), '|', before.trim(), '->', after.trim())
}
await b.close(); console.log('EVENTS PASS')
