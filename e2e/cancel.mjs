// A customer can cancel an order while it is still "Received", from the confirmation card and from the Profile page,
// but not once the cafe has started preparing it.
import { createRequire } from 'node:module'
// the other checks run on the flat artwork: software-rendered WebGL makes them minutes slower (stage3d.mjs covers the 3D scene)
const FLAT = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'ml-flat', value: '1' }] }] }
const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const fail = (m) => { console.error('FAIL', m); process.exit(1) }
const b = await chromium.launch()
for (const lang of ['en', 'fa']) {
  const page = await (await b.newContext({ storageState: FLAT, viewport: { width: 1440, height: 900 } })).newPage()
  await page.addInitScript((l) => localStorage.setItem('ml-ui', JSON.stringify({ state: { lang: l, theme: null, notifyOn: true, favorites: [], registered: [] }, version: 1 })), lang)
  const order = async () => {
    await page.goto(BASE + '#menu'); await page.waitForSelector('.mgrid')
    await page.click('.mc:nth-child(1) .plus'); await page.waitForSelector('.toast')
    await page.click('#tabs button:nth-child(4)'); await page.waitForSelector('.seg')
    await page.click('.checkout'); await page.waitForSelector('[data-testid=card-number]')
  }
  // 1) cancel from the confirmation card
  await order()
  await page.click('.cancelbtn'); await page.waitForSelector('.cancelask')
  await page.click('.cancelask .btn.ghost')                       // "Keep it" leaves the order alone
  if (!(await page.$('.cancelbtn'))) fail(`${lang}: keep-it should bring the cancel button back`)
  await page.click('.cancelbtn'); await page.click('.cancelask .btn.danger')
  await page.waitForSelector('.stamp.x')
  if (await page.$('[data-testid=card-number]')) fail(`${lang}: card number should disappear after cancelling`)
  if (await page.$('.cancelbtn')) fail(`${lang}: cancelled order still offers cancel`)
  await page.screenshot({ path: `/tmp/cancel-${lang}.png` })
  // 2) cancel from Profile; and once staff start the order the button is gone
  await order(); await page.click('.pbtn .btn.ghost'); await page.waitForSelector('.stepper')
  if (!(await page.$('.cancelbtn'))) fail(`${lang}: no cancel on the received order in Profile`)
  await page.goto(BASE + '#admin'); await page.waitForSelector('.board')
  await page.click('.ocard .btn:not(.ghost):not(.danger)'); await page.waitForTimeout(150)        // deposit received
  await page.click('.ocard .btn:not(.ghost):not(.danger)'); await page.waitForTimeout(150)        // start preparing
  await page.goto(BASE + '#me'); await page.waitForSelector('.stepper')
  if (await page.$('.cancelbtn')) fail(`${lang}: cancel offered after preparation started`)
  console.log(lang, 'ok')
}
await b.close(); console.log('CANCEL PASS')
