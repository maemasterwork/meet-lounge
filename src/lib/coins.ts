import type { CartLine, LedgerEntry, MenuItem, Order } from '../types'

export const balanceOf = (ledger: LedgerEntry[]) => ledger.reduce((a, e) => a + e.delta, 0)

/** Coins earned for one order: each paid unit earns its item's coinsEarned; reward lines earn nothing. */
export const earnFor = (lines: CartLine[], menu: MenuItem[]) =>
  lines.reduce((a, l) => a + (l.free ? 0 : l.qty * (menu.find((m) => m.id === l.itemId)?.coinsEarned ?? 0)), 0)
export const earnOfOrder = (o: Pick<Order, 'items'>) => o.items.reduce((a, i) => a + (i.free ? 0 : i.qty * (i.coin ?? 0)), 0)

/** What the reward lines in a bag cost in coins (each item has its own price). */
export const rewardCostOf = (lines: CartLine[], menu: MenuItem[]) =>
  lines.reduce((a, l) => a + (l.free ? menu.find((m) => m.id === l.itemId)?.rewardCost ?? 0 : 0), 0)

/** Credits the coins an order earned. Calling it twice for the same order changes nothing (idempotent); 0 coins adds nothing. */
export function awardForOrder(ledger: LedgerEntry[], orderN: number, at: string, amount = 1): LedgerEntry[] {
  if (amount <= 0 || ledger.some((e) => e.orderN === orderN && e.reason === 'earn')) return ledger
  return [{ id: nextId(ledger), at, delta: amount, reason: 'earn', orderN }, ...ledger]
}

/** Spends `cost` coins for the reward lines of an order. Throws when the balance is too low. */
export function spendRewards(ledger: LedgerEntry[], cost: number, orderN: number, at: string): LedgerEntry[] {
  if (cost <= 0) return ledger
  if (balanceOf(ledger) < cost) throw new Error('not-enough-coins')
  return [{ id: nextId(ledger), at, delta: -cost, reason: 'reward', orderN }, ...ledger]
}

/** Cancelling an order refunds the coins it spent on rewards and takes back the coins it earned. */
export function cancelOrder(ledger: LedgerEntry[], orderN: number, at: string): LedgerEntry[] {
  let out = ledger
  const spent = ledger.find((e) => e.orderN === orderN && e.reason === 'reward')
  if (spent && !ledger.some((e) => e.orderN === orderN && e.reason === 'refund'))
    out = [{ id: nextId(out), at, delta: -spent.delta, reason: 'refund', orderN }, ...out]
  const earned = ledger.find((e) => e.orderN === orderN && e.reason === 'earn')
  if (earned && !ledger.some((e) => e.orderN === orderN && e.reason === 'revoke'))
    out = [{ id: nextId(out), at, delta: -earned.delta, reason: 'revoke', orderN }, ...out]
  return out
}

/** Can the customer still take this reward, given the coins already committed to reward lines in the bag? */
export const canTakeReward = (balance: number, cost: number, committed: number) => balance - committed >= cost

/** Cheapest reward among the eligible items: the "next reward" target for the progress ring. */
export const nextRewardCost = (menu: MenuItem[], fallback: number) => {
  const costs = menu.filter((m) => m.rewardEligible && isAvailable(m)).map((m) => m.rewardCost)
  return costs.length ? Math.min(...costs) : fallback
}
export const coinsToNext = (balance: number, target: number) => Math.max(0, target - balance)

/** On sale: switched on and not sold out. */
export const isAvailable = (m: Pick<MenuItem, 'available' | 'stock'>) => m.available && (m.stock === null || m.stock > 0)
/** Units of this item that can still be added, counting what is already in the bag. */
export const stockLeft = (m: Pick<MenuItem, 'id' | 'stock'>, lines: CartLine[]) =>
  m.stock === null ? Infinity : Math.max(0, m.stock - lines.filter((l) => l.itemId === m.id).reduce((a, l) => a + l.qty, 0))
/** Low-stock hint threshold for the "Only N left" label. */
export const LOW_STOCK = 5

function nextId(l: LedgerEntry[]) { return l.reduce((m, e) => Math.max(m, e.id), 0) + 1 }
