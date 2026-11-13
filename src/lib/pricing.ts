import type { CartLine, MenuItem, Offer, OrderMode } from '../types'
import { MILKS } from '../data/catalog'

const roundK = (n: number) => Math.round(n / 1000) * 1000

export const sizeOf = (item: MenuItem, key: string) => item.sizes.find((s) => s.key === key) ?? item.sizes[0]

export interface Selection { size: string; milk: number }

/** Price before any offer: base price x size multiplier + milk surcharge, rounded to 1,000 Toman. */
export function basePrice(item: MenuItem, sel: Selection): number {
  let p = item.price * sizeOf(item, sel.size).mult
  if (item.milk) p += MILKS[sel.milk]?.add ?? 0
  return roundK(p)
}

export const offerFor = (itemId: string, offers: Offer[]) => offers.find((o) => o.active && o.itemId === itemId && o.pct > 0)

/** Price after the item's active offer (if any). */
export function unitPrice(item: MenuItem, sel: Selection, offers: Offer[]): number {
  const b = basePrice(item, sel)
  const o = offerFor(item.id, offers)
  return o ? roundK(b * (1 - o.pct / 100)) : b
}

export function lineTotal(line: CartLine, items: MenuItem[], offers: Offer[]): number {
  if (line.free) return 0
  const item = items.find((i) => i.id === line.itemId)
  return item ? unitPrice(item, line, offers) * line.qty : 0
}

export interface Totals { subtotal: number; fee: number; total: number }
export function orderTotals(lines: CartLine[], items: MenuItem[], offers: Offer[], mode: OrderMode, deliveryFee: number): Totals {
  const subtotal = lines.reduce((a, l) => a + lineTotal(l, items, offers), 0)
  const fee = mode === 'delivery' && lines.length ? deliveryFee : 0
  return { subtotal, fee, total: subtotal + fee }
}
