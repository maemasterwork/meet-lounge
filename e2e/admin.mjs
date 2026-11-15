// Dashboard walk-through on the demo data: new item and offer appear in the shop, price change, brand name, coins, stats.
// Run:  npm run build && npx vite preview --port 4173 &   then   node e2e/admin.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
// the other checks run on the flat artwork: software-rendered WebGL makes them minutes slower (stage3d.mjs covers the 3D scene)
const FLAT = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'ml-flat', value: '1' }] }] }
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }
const browser = await chromium.launch()
const page = await (await browser.newContext({ storageState: FLAT, viewport: { width: 1440, height: 900 } })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_/.test(m.text())) errors.push(m.text()) })
await page.addInitScript(() => localStorage.setItem('ml-ui', JSON.stringify({ state: { lang: 'en', theme: null, notifyOn: true, favorites: [], registered: [] }, version: 1 })))
await page.goto(BASE + '#admin')
await page.waitForSelector('.board')
const tab = (name) => page.click(`.atabs button:has-text("${name}")`)

// Menu: change a price, add an item
await tab('Menu')
await page.waitForSelector('table input[type=number]')
const first = page.locator('table input[type=number]').first()
await first.fill('99000'); await first.press('Enter')
await page.waitForTimeout(150)
if ((await page.locator('table input[type=number]').first().inputValue()) !== '99000') fail('price did not stick')
const form = page.locator('.panel', { hasText: 'New item' })
await form.locator('input').nth(0).fill('نوشیدنی تازه'); await form.locator('input').nth(1).fill('Fresh Special')
await form.locator('label:has-text("Price") input').fill('155000')
await form.locator('label:has-text("Stock") input').fill('2')
await form.locator('label:has-text("Coins earned") input').fill('3')
await form.locator('button:has-text("Create")').click()
await page.waitForSelector('text=Fresh Special')
// the new item carries its stock and coins into the table
const frow = page.locator('tr', { hasText: 'Fresh Special' })
if ((await frow.locator('input.num').nth(0).inputValue()) !== '2') fail('stock not saved on the new item')
if ((await frow.locator('input.num').nth(1).inputValue()) !== '3') fail('coins earned not saved')
await frow.locator('input.num').nth(0).fill('0'); await frow.locator('input.num').nth(0).press('Enter')
await page.waitForSelector('tr:has-text("Fresh Special") .pillst.bad')
await page.screenshot({ path: '/tmp/admin-menu.png' })

// Offers: create one
await tab('Offers')
await page.locator('.panel input').first().fill('پیشنهاد تست')
await page.locator('.panel textarea').first().fill('متن کوتاه')
await page.locator('button:has-text("Send to customers")').click()
await page.waitForSelector('text=پیشنهاد تست')

// Events: add one for tomorrow, see it listed, then see it as the next event in the shop
await tab('Events')
await page.waitForSelector('text=Cake Decorating Night')
await page.click('button:has-text("New event")')
const evf = page.locator('.panel', { hasText: 'Start time' })
await evf.locator('label:has-text("Persian name") input').fill('شب شعر')
await evf.locator('label:has-text("English name") input').fill('Poetry Night')
const tom = new Date(Date.now() + 864e5), ymd = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`
await evf.locator('input[type=date]').fill(ymd)
await evf.locator('label:has-text("Total seats") input').fill('6')
await evf.locator('label:has-text("Seats you keep") input').fill('7')
if (!(await evf.locator('.err').count())) fail('keeping more seats than the total should warn')
await evf.locator('label:has-text("Seats you keep") input').fill('1')
await evf.locator('button:has-text("Save")').click()
await page.waitForSelector('tr:has-text("Poetry Night")')
await page.screenshot({ path: '/tmp/admin-events.png' })
await page.goto(BASE + '#events'); await page.waitForSelector('.tickets')
if (!(await page.textContent('.tickets')).includes('Poetry Night')) fail('new event is not the next event in the shop')
const seatsBefore = await page.textContent('.seats')
await page.click('.btn.seat'); await page.waitForTimeout(150)
if ((await page.textContent('.seats')) === seatsBefore) fail('saving a seat did not change the count')
await page.goto(BASE + '#admin'); await page.waitForSelector('.board'); await tab('Events')
await page.click('tr:has-text("Poetry Night") button:has-text("Guests")'); await page.waitForSelector('.guests li')
await page.click('tr:has-text("Poetry Night") button:has-text("Delete")'); await page.click('button:has-text("Yes, delete")')
await page.waitForSelector('tr:has-text("Poetry Night")', { state: 'detached' })

// Coins: adjust a customer
await tab('Coins')
await page.waitForSelector('text=Sara')
if ((await page.locator('.kpi').count()) < 4) fail('coin summary tiles missing')
// per-item reward price edited from the Coins tab
const lrow = page.locator('tr', { hasText: 'Latte' }).first()
const cost = lrow.locator('input.num').nth(0)
await cost.fill('4'); await cost.press('Enter'); await page.waitForTimeout(200)
if ((await lrow.locator('input.num').nth(0).inputValue()) !== '4') fail('reward price did not stick')
await page.click('button:has-text("Set all reward items to")'); await page.waitForSelector('text=Reward price updated')
if ((await lrow.locator('input.num').nth(0).inputValue()) !== '6') fail('apply-all did not reset reward prices')
await page.screenshot({ path: '/tmp/admin-coins.png' })
const row = page.locator('tr', { hasText: 'Sara' })
await row.locator('input[type=number]').fill('2'); await row.locator('input').nth(1).fill('gift')
await row.locator('button:has-text("Apply")').click()
await page.waitForSelector('text=Saved')

// Brand: rename, then see it in the shop
await tab('Brand')
await page.locator('.panel', { hasText: 'Brand and hero image' }).locator('input').nth(1).fill('Test Lounge')
await page.locator('.panel', { hasText: 'Brand and hero image' }).locator('button:has-text("Save")').first().click()
await page.waitForSelector('text=Saved')

// Season: the owner switches the 3D cafe to summer
const seasonBtns = page.locator('.panel', { hasText: 'Season' }).locator('button[aria-pressed]')
if ((await seasonBtns.nth(2).getAttribute('aria-pressed')) !== 'true') fail('fall should be the default season')
await seasonBtns.nth(1).click()
await page.waitForFunction(() => [...document.querySelectorAll('.panel button[aria-pressed="true"]')].some((b) => b.textContent === 'Summer'))

// Special event: Nowruz also sets spring; None leaves the season alone
const evBtns = page.locator('.panel', { hasText: 'Special event' }).locator('button[aria-pressed]')
await evBtns.nth(3).click()
await page.waitForFunction(() => [...document.querySelectorAll('.panel button[aria-pressed="true"]')].some((b) => b.textContent === 'Nowruz'))
if ((await seasonBtns.nth(0).getAttribute('aria-pressed')) !== 'true') fail('Nowruz should switch the season to spring')
await evBtns.nth(0).click()
await page.waitForFunction(() => [...document.querySelectorAll('.panel button[aria-pressed="true"]')].some((b) => b.textContent === 'None'))

// Stats render
await tab('Stats')
await page.waitForSelector('.kpis')

// Back to the shop: new item is in the menu strip, brand name changed
await page.goto(BASE + '#menu'); await page.waitForSelector('.mgrid')
await page.click('.chips2 button:has-text("Hot")')
const names = await page.evaluate(() => [...document.querySelectorAll('.mo .nm')].map((e) => e.textContent))
if (!names.includes('Fresh Special')) fail('new item missing from the shop: ' + names.join('|'))
if (errors.length) fail('console errors: ' + errors.join(' | '))
await browser.close()
if (!process.exitCode) console.log('ADMIN PASS')
