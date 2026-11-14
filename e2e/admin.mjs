// Dashboard walk-through on the demo data: new item and offer appear in the shop, price change, brand name, coins, stats.
// Run:  npm run build && npx vite preview --port 4173 &   then   node e2e/admin.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
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

// Coins: adjust a customer
await tab('Coins')
await page.waitForSelector('text=Sara')
const row = page.locator('tr', { hasText: 'Sara' })
await row.locator('input[type=number]').fill('2'); await row.locator('input').nth(1).fill('gift')
await row.locator('button:has-text("Apply")').click()
await page.waitForSelector('text=Saved')

// Brand: rename, then see it in the shop
await tab('Brand')
await page.locator('.panel', { hasText: 'Brand and hero image' }).locator('input').nth(1).fill('Test Lounge')
await page.locator('.panel', { hasText: 'Brand and hero image' }).locator('button:has-text("Save")').first().click()
await page.waitForSelector('text=Saved')

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
