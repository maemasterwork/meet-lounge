import { describe, expect, it } from 'vitest'
import type { LedgerEntry } from '../types'
import { awardForOrder, balanceOf, cancelOrder, coinsToNext, rewardsAvailable, spendRewards } from './coins'

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
    expect(balanceOf(spendRewards(l, 6, 1, 9, 't'))).toBe(0)
  })
  it('refuses when the balance is too low', () => {
    expect(() => spendRewards(start, 6, 1, 9, 't')).toThrow('not-enough-coins')
    expect(() => spendRewards(awardForOrder(start, 7, 't'), 6, 2, 9, 't')).toThrow()
  })
  it('does nothing for zero rewards', () => {
    expect(spendRewards(start, 6, 0, 9, 't')).toBe(start)
  })
})

describe('cancel', () => {
  it('refunds reward coins', () => {
    const spent = spendRewards(awardForOrder(start, 7, 't'), 6, 1, 9, 't')
    expect(balanceOf(cancelOrder(spent, 9, 't'))).toBe(6)
  })
  it('takes back the coin earned by the order', () => {
    const earned = awardForOrder(start, 7, 't')
    expect(balanceOf(cancelOrder(earned, 7, 't'))).toBe(5)
  })
  it('refunds only once', () => {
    const spent = spendRewards(awardForOrder(start, 7, 't'), 6, 1, 9, 't')
    const c = cancelOrder(spent, 9, 't')
    expect(balanceOf(cancelOrder(c, 9, 't'))).toBe(6)
  })
})

describe('helpers', () => {
  it('counts rewards left after the bag', () => {
    expect(rewardsAvailable(13, 6, 0)).toBe(2)
    expect(rewardsAvailable(13, 6, 2)).toBe(0)
    expect(rewardsAvailable(5, 6, 0)).toBe(0)
  })
  it('counts coins to the next reward', () => {
    expect(coinsToNext(5, 6)).toBe(1)
    expect(coinsToNext(6, 6)).toBe(0)
  })
})
