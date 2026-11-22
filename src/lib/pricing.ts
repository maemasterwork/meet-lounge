import type { CartLine, MenuItem, Offer, OrderMode, SizeOption, Syrup } from '../types'
import { MILKS } from '../data/catalog'

const roundK = (n: number) => Math.round(n / 1000) * 1000
const DEFAULT_SIZE: SizeOption = { key: '', mult: 1, scale: 1 }

export const sizeKeyOf = (item: MenuItem) => item.sizes[0]?.key ?? ''
export const sizeOf = (item: MenuItem, key: string): SizeOption => item.sizes.find((s) => s.key === key) ?? item.sizes[0] ?? DEFAULT_SIZE

export interface Selection { size: string; milk: number; syrupId?: string | null; syrupPumps?: number }

/** Price before any offer: base price x size multiplier + milk surcharge, rounded to 1,000 Toman. */
export function basePrice(item: MenuItem, sel: Selection): number {
  let p = item.price * sizeOf(item, sel.size).mult
  if (item.milk) p += MILKS[sel.milk]?.add ?? 0
  return roundK(p)
}

export const offerFor = (itemId: string, offers: Offer[]) => offers.find((o) => o.active && o.itemId === itemId && o.pct > 0)

export const syrupPrice = (sel: Pick<Selection, 'syrupId' | 'syrupPumps'>, syrups: Syrup[]) =>
  (syrups.find((s) => s.id === sel.syrupId)?.pricePerPump ?? 0) * (sel.syrupPumps ?? 0)

/** Applies discounts to the item price, then adds any selected syrup charge. */
export function unitPrice(item: MenuItem, sel: Selection, offers: Offer[], syrups: Syrup[] = []): number {
  const b = basePrice(item, sel)
  const o = offerFor(item.id, offers)
  return (o ? roundK(b * (1 - o.pct / 100)) : b) + syrupPrice(sel, syrups)
}

export function lineTotal(line: CartLine, items: MenuItem[], offers: Offer[], syrups: Syrup[] = []): number {
  if (line.free) return 0
  const item = items.find((i) => i.id === line.itemId)
  return item ? unitPrice(item, line, offers, syrups) * line.qty : 0
}

export interface Totals { subtotal: number; fee: number; total: number }
export function orderTotals(lines: CartLine[], items: MenuItem[], offers: Offer[], mode: OrderMode, deliveryFee: number, syrups: Syrup[] = []): Totals {
  const subtotal = lines.reduce((a, l) => a + lineTotal(l, items, offers, syrups), 0)
  const fee = mode === 'delivery' && lines.length ? deliveryFee : 0
  return { subtotal, fee, total: subtotal + fee }
}
