import { useEffect, useRef } from 'react'
import { useShop } from '../data/context'
import { useI18n } from '../i18n'
import { useUi } from '../store/ui'
import type { Lang, Offer, Order, OrderStatus } from '../types'

/**
 * Notifications the app shows by itself, with no server: it watches the customer's orders and offers (they update live)
 * and shows a system notification through the service worker. This works while the app is open, in a background tab,
 * or just after the visitor switched away. Messages while the app is fully closed need the server push (SETUP.md).
 */
export const NOTIFY_STATUSES: OrderStatus[] = ['ready', 'out', 'done']

export interface Notice { title: string; body: string; tag: string; url: string }
export type Tr = (key: string, vars?: Record<string, string | number>) => string

/** What changed between two snapshots: orders that reached ready/out/done and offers that are new. Nothing on the first snapshot. */
export function diffNotices(
  prev: { orders: Map<number, OrderStatus>; offers: Set<number> } | null,
  orders: Order[], offers: Offer[], t: Tr, n: (v: number) => string, lang: Lang,
): { notices: Notice[]; next: { orders: Map<number, OrderStatus>; offers: Set<number> } } {
  const next = { orders: new Map(orders.map((o) => [o.n, o.status] as const)), offers: new Set(offers.map((o) => o.id)) }
  const notices: Notice[] = []
  if (!prev) return { notices, next }
  for (const o of orders) {
    const was = prev.orders.get(o.n)
    if (was !== undefined && was !== o.status && NOTIFY_STATUSES.includes(o.status))
      notices.push({ title: t(`notify.order.${o.status}`, { n: n(o.n) }), body: t(`notify.order.${o.status}.body`), tag: `order-${o.n}`, url: './#me' })
  }
  for (const f of offers) {
    if (!prev.offers.has(f.id) && f.active && !f.read)
      notices.push({ title: f.title[lang] || t('notify.offer'), body: f.body[lang] || '', tag: `offer-${f.id}`, url: './#menu' })
  }
  return { notices, next }
}

export const canNotify = () => typeof Notification !== 'undefined' && Notification.permission === 'granted' && 'serviceWorker' in navigator

/** Shows one system notification through the service worker (falls back to the Notification API). */
export async function showSystem(m: Notice, lang: string) {
  const opts: NotificationOptions & { badge?: string } = {
    body: m.body, icon: './icon-192.png', badge: './icon-192.png', tag: m.tag, lang, dir: lang === 'fa' ? 'rtl' : 'ltr', data: { url: m.url },
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg) { await reg.showNotification(m.title, opts); return true }
    new Notification(m.title, opts); return true
  } catch { return false }
}

export type TestResult = 'sent' | 'denied' | 'unavailable' | 'off' | 'error'
/** The "send me a test" button: asks for permission if needed, then shows a test notification. */
export async function sendTest(lang: string, title: string, body: string, on: boolean): Promise<TestResult> {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return 'unavailable'
  if (!on) return 'off'
  const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (perm !== 'granted') return 'denied'
  return (await showSystem({ title, body, tag: 'ml-test', url: './' }, lang)) ? 'sent' : 'error'
}

/** Mount once inside the data provider. */
export function useLocalNotify() {
  const { data } = useShop()
  const { t, n, lang } = useI18n()
  const on = useUi((s) => s.notifyOn)
  const toast = useUi((s) => s.toast)
  const prev = useRef<{ orders: Map<number, OrderStatus>; offers: Set<number> } | null>(null)
  const live = useRef({ t, n, lang, on, toast })
  live.current = { t, n, lang, on, toast }
  const mine = data?.mine, offers = data?.offers
  useEffect(() => {
    if (!mine || !offers) return
    const { t: tr, n: nn, lang: lg, on: enabled, toast: say } = live.current
    const { notices, next } = diffNotices(prev.current, mine, offers, tr, nn, lg)
    prev.current = next
    if (!enabled) return
    for (const m of notices) {
      if (document.visibilityState === 'visible') say(m.body ? `${m.title} — ${m.body}` : m.title, { gold: true })
      else if (canNotify()) void showSystem(m, lg)
    }
  }, [mine, offers])
}
