// 3D background: renders, footer view buttons work, light/dark switches the model to night, season shows in the sky.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const base = process.env.BASE || 'http://localhost:4173/'
const shots = process.env.SHOTS
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: 'light' })
const p = await ctx.newPage(); p.setDefaultTimeout(150000)
const errs = []; p.on('pageerror', (e) => errs.push(String(e)))
await p.goto(base + '#/')
await p.waitForSelector('html.has3d', { timeout: 120000, state: 'attached' }); ok(true, '3D scene started (html.has3d)')
await p.waitForTimeout(2500)
ok((await p.locator('.stage3d canvas').count()) === 1, 'one canvas')
ok((await p.locator('.views3d .seg3 button').count()) === 5, 'five view buttons in the footer')
ok((await p.locator('.stage3d').getAttribute('data-mode')) === 'day', 'light theme = day')
if (shots) await p.screenshot({ path: `${shots}/home-day.png` })
await p.locator('.seg3 button', { hasText: 'Inside' }).or(p.locator('.seg3 button').nth(3)).first().click()
ok((await p.locator('.seg3 button[aria-pressed="true"]').count()) === 1, 'one pressed view button')
await p.waitForTimeout(2500)
if (shots) await p.screenshot({ path: `${shots}/home-inside.png` })
// dragging the empty background clears the pressed view
const box = await p.locator('.stage3d canvas').boundingBox()
await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5, { steps: 5 }); await p.mouse.up()
ok((await p.locator('.seg3 button[aria-pressed="true"]').count()) === 0, 'dragging the model clears the selected view')
// dark theme -> night
await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(600)
ok((await p.locator('.stage3d').getAttribute('data-mode')) === 'night', 'dark theme = night')
await p.waitForTimeout(2500)
if (shots) await p.screenshot({ path: `${shots}/home-night.png` })
await p.emulateMedia({ colorScheme: 'light' })
// other page keeps the model behind
await p.goto(base + '#/menu'); await p.waitForTimeout(1500)
if (shots) await p.screenshot({ path: `${shots}/menu.png` })
ok(await p.locator('html.has3d').count() === 1, 'still running on the menu page')
// phone
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const q = await m.newPage(); q.setDefaultTimeout(150000); await q.goto(base + '#/'); await q.waitForSelector('html.has3d', { timeout: 120000, state: 'attached' }); await q.waitForTimeout(2500)
ok(await q.locator('.cyc3').isVisible(), 'phone: single view button shown')
ok(!(await q.locator('.seg3').isVisible()), 'phone: segmented buttons hidden')
const before = await q.locator('.cyc3 span').textContent(); await q.locator('.cyc3').click()
ok((await q.locator('.cyc3 span').textContent()) !== before, 'phone: tapping cycles the view')
if (shots) await q.screenshot({ path: `${shots}/phone.png` })
ok(errs.length === 0, 'no page errors ' + errs.join('|'))
await b.close(); process.exit(fails ? 1 : 0)
