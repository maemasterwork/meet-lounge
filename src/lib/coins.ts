import type { LedgerEntry } from '../types'

export const balanceOf = (ledger: LedgerEntry[]) => ledger.reduce((a, e) => a + e.delta, 0)

/** One coin per completed order. Calling it twice for the same order changes nothing (idempotent). */
export function awardForOrder(ledger: LedgerEntry[], orderN: number, at: string): LedgerEntry[] {
  if (ledger.some((e) => e.orderN === orderN && e.reason === 'earn')) return ledger
  return [{ id: nextId(ledger), at, delta: 1, reason: 'earn', orderN }, ...ledger]
}

/** Spends N coins for each reward line. Throws when the balance is too low. */
export function spendRewards(ledger: LedgerEntry[], every: number, count: number, orderN: number, at: string): LedgerEntry[] {
  if (count <= 0) return ledger
  const cost = every * count
  if (balanceOf(ledger) < cost) throw new Error('not-enough-coins')
  return [{ id: nextId(ledger), at, delta: -cost, reason: 'reward', orderN }, ...ledger]
}

/** Cancelling an order refunds the coins it spent on rewards and takes back the coin it earned. */
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

/** How many free items the customer can still add, given reward lines already in the bag. */
export const rewardsAvailable = (balance: number, every: number, inBag: number) => Math.max(0, Math.floor(balance / every) - inBag)

/** Coins left until a reward is ready (0 when one is ready). */
export const coinsToNext = (balance: number, every: number) => Math.max(0, every - balance)

function nextId(l: LedgerEntry[]) { return l.reduce((m, e) => Math.max(m, e.id), 0) + 1 }
