import { describe, expect, it } from 'vitest'
import type { LedgerEntry } from '../types'
import { awardForOrder, balanceOf, canTakeReward, cancelOrder, coinsToNext, earnFor, isAvailable, nextRewardCost, rewardCostOf, spendRewards, stockLeft } from './coins'
import type { CartLine, MenuItem } from '../types'

const start: LedgerEntry[] = [{ id: 1, at: 't', delta: 5, reason: 'welcome' }]

describe('award', () => {
  it('gives one coin per completed order', () => {
    expect(balanceOf(awardForOrder(start, 7, 't'))).toBe(6)
  })
  it('is idempotent for the same order', () => {
    const once = awardForOrder(start, 7, 't')
    expect(awardForOrder(once, 7, 't')).toBe(once)
    expect(balanceOf(awardForOrder(once, 8, 't'))).toBe(7)
  })
})

describe('spend', () => {
  it('spends N coins per reward line', () => {
    const l = awardForOrder(start, 7, 't') // 6 coins
    expect(balanceOf(spendRewards(l, 6, 9, 't'))).toBe(0)
  })
  it('refuses when the balance is too low', () => {
    expect(() => spendRewards(start, 6, 9, 't')).toThrow('not-enough-coins')
    expect(() => spendRewards(awardForOrder(start, 7, 't'), 12, 9, 't')).toThrow()
  })
  it('does nothing for zero rewards', () => {
    expect(spendRewards(start, 0, 9, 't')).toBe(start)
  })
})

describe('cancel', () => {
  it('refunds reward coins', () => {
    const spent = spendRewards(awardForOrder(start, 7, 't'), 6, 9, 't')
    expect(balanceOf(cancelOrder(spent, 9, 't'))).toBe(6)
  })
  it('takes back the coin earned by the order', () => {
    const earned = awardForOrder(start, 7, 't')
    expect(balanceOf(cancelOrder(earned, 7, 't'))).toBe(5)
  })
  it('refunds only once', () => {
    const spent = spendRewards(awardForOrder(start, 7, 't'), 6, 9, 't')
    const c = cancelOrder(spent, 9, 't')
    expect(balanceOf(cancelOrder(c, 9, 't'))).toBe(6)
  })
})

const it1 = (o: Partial<MenuItem>): MenuItem => ({ id: 'a', cat: 'hot', price: 1, art: 'x', milk: false, available: true, rewardEligible: true, coinsEarned: 1, rewardCost: 6, stock: null, sizes: [], tags: [], ...o })
const ln = (itemId: string, qty = 1, free = false): CartLine => ({ itemId, size: 's', milk: 0, sugar: 1, qty, free })

describe('award amount', () => {
  it('credits the given amount and nothing for zero', () => {
    expect(balanceOf(awardForOrder(start, 7, 't', 4))).toBe(9)
    expect(awardForOrder(start, 7, 't', 0)).toBe(start)
  })
})

describe('per-item coins', () => {
  const menu = [it1({ id: 'a', coinsEarned: 3, rewardCost: 4 }), it1({ id: 'b', coinsEarned: 0, rewardCost: 9 }), it1({ id: 'c', coinsEarned: 1, rewardCost: 5, rewardEligible: false })]
  it('earns coinsEarned per paid unit and nothing for reward lines', () => {
    expect(earnFor([ln('a', 2), ln('b', 5), ln('c')], menu)).toBe(7)
    expect(earnFor([ln('a', 1, true)], menu)).toBe(0)
  })
  it('costs each reward line its own price', () => {
    expect(rewardCostOf([ln('a', 1, true), ln('b', 1, true), ln('c')], menu)).toBe(13)
  })
  it('checks affordability against coins already committed in the bag', () => {
    expect(canTakeReward(13, 9, 4)).toBe(true)
    expect(canTakeReward(13, 9, 5)).toBe(false)
  })
  it('the next-reward target is the cheapest eligible, on-sale item', () => {
    expect(nextRewardCost(menu, 6)).toBe(4)
    expect(nextRewardCost([it1({ id: 'a', rewardCost: 4, stock: 0 }), it1({ id: 'b', rewardCost: 9 })], 6)).toBe(9)
    expect(nextRewardCost([], 6)).toBe(6)
  })
  it('counts coins to the next reward', () => {
    expect(coinsToNext(5, 6)).toBe(1)
    expect(coinsToNext(6, 6)).toBe(0)
  })
})

describe('stock', () => {
  it('sold out when switched off or stock is 0; null is unlimited', () => {
    expect(isAvailable(it1({}))).toBe(true)
    expect(isAvailable(it1({ stock: 0 }))).toBe(false)
    expect(isAvailable(it1({ stock: 2, available: false }))).toBe(false)
  })
  it('units left subtract everything of that item already in the bag', () => {
    expect(stockLeft(it1({ stock: 5 }), [ln('a', 2), ln('a', 1, true), ln('b', 4)])).toBe(2)
    expect(stockLeft(it1({ stock: 1 }), [ln('a', 3)])).toBe(0)
    expect(stockLeft(it1({ stock: null }), [ln('a', 3)])).toBe(Infinity)
  })
})
