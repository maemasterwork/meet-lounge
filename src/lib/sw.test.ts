// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

/** Runs public/sw.js against a fake service worker scope and fires its events. */
function load() {
  const handlers: Record<string, (e: any) => void> = {}
  const shown: any[] = []
  const opened: string[] = []
  const focused = vi.fn(), navigated = vi.fn(async () => undefined)
  let clients: any[] = []
  const self: any = {
    location: { origin: 'https://x.test' }, registration: { scope: 'https://x.test/meet/', showNotification: async (t: string, o: any) => { shown.push({ t, o }) } },
    addEventListener: (n: string, f: any) => { handlers[n] = f }, skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => clients, openWindow: async (u: string) => { opened.push(u) } },
  }
  new Function('self', 'caches', 'fetch', readFileSync('public/sw.js', 'utf8'))(self, {}, async () => new Response('x'))
  return { handlers, shown, opened, focused, navigated, setClients: (c: any[]) => { clients = c } }
}
const waitable = () => { const p: Promise<unknown>[] = []; return { waitUntil: (x: Promise<unknown>) => { p.push(x) }, done: () => Promise.all(p) } }

describe('service worker push', () => {
  it('shows the notification with title, body, tag and direction from the payload', async () => {
    const sw = load(); const w = waitable()
    sw.handlers.push({ ...w, data: { json: () => ({ title: 'سفارش ۱۰۴ آماده است', body: 'تحویل بگیرید', tag: 'order-104', dir: 'rtl', lang: 'fa', url: './#me' }) } })
    await w.done()
    expect(sw.shown[0].t).toBe('سفارش ۱۰۴ آماده است')
    expect(sw.shown[0].o).toMatchObject({ body: 'تحویل بگیرید', tag: 'order-104', dir: 'rtl', lang: 'fa', data: { url: './#me' } })
  })
  it('still shows something for an empty or broken payload', async () => {
    const sw = load(); const w = waitable()
    sw.handlers.push({ ...w, data: { json: () => { throw new Error('bad') }, text: () => 'hello' } })
    await w.done()
    expect(sw.shown[0].t).toBe('Meet Lounge'); expect(sw.shown[0].o.body).toBe('hello')
  })
  it('tapping a notification focuses an open window, or opens the page inside the app scope', async () => {
    const sw = load()
    let w = waitable(); const close = vi.fn()
    sw.setClients([{ navigate: sw.navigated, focus: sw.focused }])
    sw.handlers.notificationclick({ ...w, notification: { close, data: { url: './#me' } } }); await w.done()
    expect(close).toHaveBeenCalled(); expect(sw.navigated).toHaveBeenCalledWith('https://x.test/meet/#me'); expect(sw.focused).toHaveBeenCalled()
    sw.setClients([]); w = waitable()
    sw.handlers.notificationclick({ ...w, notification: { close, data: { url: './#menu' } } }); await w.done()
    expect(sw.opened).toEqual(['https://x.test/meet/#menu'])
  })
  it('never intercepts requests to other origins (Supabase) or non-GET requests', () => {
    const sw = load(); const respondWith = vi.fn()
    sw.handlers.fetch({ request: { method: 'GET', url: 'https://abc.supabase.co/rest/v1/orders', mode: 'cors' }, respondWith })
    sw.handlers.fetch({ request: { method: 'POST', url: 'https://x.test/meet/x', mode: 'cors' }, respondWith })
    expect(respondWith).not.toHaveBeenCalled()
  })
})
