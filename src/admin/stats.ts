import type { Order } from '../types'

export interface Stats {
  sales: number; count: number; basket: number; cancelled: number; itemsSold: number; rewardsUsed: number
  hourly: number[]            // 24 values: sales per hour of today
  top: { itemId: string; qty: number }[]
  days: { date: string; sales: number }[]   // last 7 days, oldest first
  peakHour: number | null
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Everything the Stats tab shows, from the order list. Cancelled orders never count as sales. */
export function computeStats(orders: Order[], now = new Date()): Stats {
  const today = orders.filter((o) => sameDay(new Date(o.at), now))
  const live = today.filter((o) => o.status !== 'cancelled')
  const hourly = Array<number>(24).fill(0)
  const qty = new Map<string, number>()
  let itemsSold = 0, rewardsUsed = 0
  for (const o of live) {
    hourly[new Date(o.at).getHours()] += o.total
    for (const i of o.items) { if (i.free) { rewardsUsed += 1; continue } qty.set(i.itemId, (qty.get(i.itemId) ?? 0) + i.qty); itemsSold += i.qty }
  }
  const sales = live.reduce((a, o) => a + o.total, 0)
  const max = Math.max(...hourly)
  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(now); d.setDate(now.getDate() - (6 - k))
    const s = orders.filter((o) => o.status !== 'cancelled' && key(new Date(o.at)) === key(d)).reduce((a, o) => a + o.total, 0)
    return { date: key(d), sales: s }
  })
  return {
    sales, count: live.length, basket: live.length ? Math.round(sales / live.length) : 0, cancelled: today.length - live.length, itemsSold, rewardsUsed, hourly,
    top: [...qty].map(([itemId, q]) => ({ itemId, qty: q })).sort((a, b) => b.qty - a.qty || a.itemId.localeCompare(b.itemId)).slice(0, 5),
    days, peakHour: max > 0 ? hourly.indexOf(max) : null,
  }
}
