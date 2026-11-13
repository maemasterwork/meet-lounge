import { describe, expect, it } from 'vitest'
import { computeStats } from './stats'
import type { Order } from '../types'

const now = new Date(2026, 10, 13, 15, 0)
const o = (n: number, h: number, total: number, status: Order['status'] = 'done', items: Order['items'] = [{ itemId: 'latte', qty: 1, free: false }], dayOffset = 0): Order => ({
  n, mode: 'pickup', items, subtotal: total, fee: 0, total, status, mine: false, who: 'x', at: new Date(2026, 10, 13 - dayOffset, h, 5).toISOString(),
})

describe('computeStats', () => {
  it('counts sales, basket and hours for today and skips cancelled orders', () => {
    const s = computeStats([o(1, 9, 100000), o(2, 9, 200000), o(3, 14, 60000, 'cancelled'), o(4, 11, 90000)], now)
    expect(s.sales).toBe(390000); expect(s.count).toBe(3); expect(s.basket).toBe(130000); expect(s.cancelled).toBe(1)
    expect(s.hourly[9]).toBe(300000); expect(s.peakHour).toBe(9)
  })
  it('ranks best sellers by quantity and does not count free reward items as sold', () => {
    const s = computeStats([o(1, 9, 1, 'done', [{ itemId: 'latte', qty: 3, free: false }, { itemId: 'mocha', qty: 1, free: false }]), o(2, 9, 0, 'done', [{ itemId: 'latte', qty: 1, free: true }])], now)
    expect(s.top[0]).toEqual({ itemId: 'latte', qty: 3 }); expect(s.itemsSold).toBe(4); expect(s.rewardsUsed).toBe(1)
  })
  it('builds a 7 day series, oldest first, and ignores other days in today numbers', () => {
    const s = computeStats([o(1, 9, 50000), o(2, 9, 70000, 'done', undefined, 2), o(3, 9, 10000, 'done', undefined, 9)], now)
    expect(s.days).toHaveLength(7); expect(s.days[6].sales).toBe(50000); expect(s.days[4].sales).toBe(70000)
    expect(s.sales).toBe(50000)
  })
  it('is all zero with no orders', () => {
    const s = computeStats([], now)
    expect(s.sales).toBe(0); expect(s.basket).toBe(0); expect(s.peakHour).toBeNull(); expect(s.top).toEqual([])
  })
})
