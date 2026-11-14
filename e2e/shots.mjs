import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const sizes = [[1920, 1080], [1440, 900], [1280, 720], [390, 844]]
const browser = await chromium.launch()
const report = []
for (const lang of ['fa', 'en']) for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.addInitScript((l) => localStorage.setItem('ml-ui', JSON.stringify({ state: { lang: l, theme: 'light', notifyOn: true, favorites: ['latte'], registered: [] }, version: 1 })), lang)
  for (const v of ['home', 'menu']) {
    await page.goto(BASE + '#' + v); await page.waitForSelector(v === 'home' ? '.hr' : v === 'menu' ? '.mgrid' : v === 'bag' ? '.bagc' : '.bigg'); await page.waitForTimeout(400)
    const over = await page.evaluate(() => ({ y: document.documentElement.scrollHeight - innerHeight, x: document.documentElement.scrollWidth - innerWidth }))
    report.push(`${lang} ${w}x${h} ${v}: overflow y=${over.y} x=${over.x}`)
    await page.screenshot({ path: `shots/${v}-${lang}-${w}x${h}.png` })
  }
  await ctx.close()
}
await browser.close()
console.log(report.join('\n'))
