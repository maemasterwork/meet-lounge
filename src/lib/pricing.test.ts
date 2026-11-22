import { describe, expect, it } from 'vitest'
import { initialMenu } from '../data/catalog'
import type { CartLine, Offer } from '../types'
import { basePrice, lineTotal, orderTotals, unitPrice } from './pricing'

const items = initialMenu()
const by = (id: string) => items.find((i) => i.id === id)!
const offer = (itemId: string, pct: number, active = true): Offer => ({ id: 1, title: { fa: '', en: '' }, body: { fa: '', en: '' }, itemId, pct, audience: 'all', active, read: false })
const line = (o: Partial<CartLine>): CartLine => ({ itemId: 'latte', size: 'medium', milk: 0, syrupId: null, syrupPumps: 0, qty: 1, free: false, ...o })

describe('basePrice', () => {
  it('uses the size multiplier and rounds to 1,000', () => {
    expect(basePrice(by('latte'), { size: 'small', milk: 0 })).toBe(135000)
    expect(basePrice(by('latte'), { size: 'medium', milk: 0 })).toBe(155000) // 135,000 x 1.15 = 155,250
    expect(basePrice(by('latte'), { size: 'large', milk: 0 })).toBe(176000) // 175,500
  })
  it('adds the milk surcharge only for milk drinks', () => {
    expect(basePrice(by('latte'), { size: 'small', milk: 1 })).toBe(150000)
    expect(basePrice(by('latte'), { size: 'small', milk: 2 })).toBe(155000)
    expect(basePrice(by('espresso'), { size: 'small', milk: 2 })).toBe(95000)
  })
  it('prices pastry portions', () => {
    expect(basePrice(by('cheesecake'), { size: 'slice2', milk: 0 })).toBe(333000) // 332,500
    expect(basePrice(by('cheesecake'), { size: 'wholeCake', milk: 0 })).toBe(1225000)
    expect(basePrice(by('cookie'), { size: 'piece3', milk: 0 })).toBe(176000) // 175,500
  })
  it('uses the base price when no sizes are configured', () => {
    const item = { ...by('latte'), sizes: [] }
    expect(basePrice(item, { size: '', milk: 0 })).toBe(item.price)
  })
})

describe('offers', () => {
  it('applies an active offer to that item only', () => {
    const o = [offer('latte', 15)]
    expect(unitPrice(by('latte'), { size: 'small', milk: 0 }, o)).toBe(115000) // 114,750
    expect(unitPrice(by('mocha'), { size: 'small', milk: 0 }, o)).toBe(150000)
  })

  describe('syrups', () => {
    const syrups = [{ id: 'vanilla', name: { fa: 'وانیل', en: 'Vanilla' }, pricePerPump: 30000, active: true }]
    it('adds syrup per pump after any item discount', () => {
      expect(unitPrice(by('latte'), { size: 'small', milk: 0, syrupId: 'vanilla', syrupPumps: 2 }, [offer('latte', 15)], syrups)).toBe(175000)
      expect(lineTotal(line({ size: 'small', syrupId: 'vanilla', syrupPumps: 1 }), items, [], syrups)).toBe(165000)
    })
  })
  it('ignores ended offers and 0% offers', () => {
    expect(unitPrice(by('latte'), { size: 'small', milk: 0 }, [offer('latte', 15, false)])).toBe(135000)
    expect(unitPrice(by('latte'), { size: 'small', milk: 0 }, [offer('latte', 0)])).toBe(135000)
  })
})

describe('totals', () => {
  const lines = [line({ size: 'small', qty: 2 }), line({ itemId: 'croissant', size: 'piece1', qty: 1 })]
  it('sums lines and quantities', () => {
    const t = orderTotals(lines, items, [], 'pickup', 30000)
    expect(t).toEqual({ subtotal: 360000, fee: 0, total: 360000 })
  })
  it('adds the delivery fee only for delivery with items', () => {
    expect(orderTotals(lines, items, [], 'delivery', 30000).total).toBe(390000)
    expect(orderTotals([], items, [], 'delivery', 30000).fee).toBe(0)
    expect(orderTotals(lines, items, [], 'table', 30000).fee).toBe(0)
  })
  it('makes reward lines free', () => {
    expect(lineTotal(line({ free: true, qty: 1 }), items, [])).toBe(0)
    expect(orderTotals([line({ free: true })], items, [], 'delivery', 30000).total).toBe(30000)
  })
  it('applies offers inside totals', () => {
    expect(orderTotals([line({ size: 'small', qty: 2 })], items, [offer('latte', 15)], 'pickup', 0).subtotal).toBe(230000)
  })
})
