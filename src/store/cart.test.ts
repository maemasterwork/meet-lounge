import { beforeEach, describe, expect, it } from 'vitest'
import { migrateCart, useCart } from './cart'

const latte = { itemId: 'latte', size: 'small', milk: 0, syrupId: null, syrupPumps: 0, qty: 1, free: false }
beforeEach(() => { useCart.setState({ lines: [], mode: 'pickup', address: '' }) })

describe('cart', () => {
  it('merges identical lines and caps quantity at 20', () => {
    useCart.getState().add(latte)
    useCart.getState().add({ ...latte, qty: 25 })
    expect(useCart.getState().lines).toHaveLength(1)
    expect(useCart.getState().lines[0].qty).toBe(20)
  })
  it('keeps different options as separate lines', () => {
    useCart.getState().add(latte)
    useCart.getState().add({ ...latte, milk: 1 })
    useCart.getState().add({ ...latte, size: 'large' })
    expect(useCart.getState().lines).toHaveLength(3)
  })
  it('never merges a reward line', () => {
    useCart.getState().add(latte)
    useCart.getState().addReward('latte', 'small')
    useCart.getState().addReward('latte', 'small')
    expect(useCart.getState().lines.filter((l) => l.free)).toHaveLength(2)
  })
  it('keeps syrup choices separate when merging cart lines', () => {
    useCart.getState().add({ ...latte, syrupId: 'vanilla', syrupPumps: 1 })
    useCart.getState().add({ ...latte, syrupId: 'caramel', syrupPumps: 1 })
    expect(useCart.getState().lines).toHaveLength(2)
  })
  it('migrates saved sugar selections to no syrup', () => {
    const old = { lines: [{ itemId: 'latte', size: 'small', milk: 0, sugar: 2, qty: 1, free: false }], mode: 'pickup', table: '4', address: '' }
    expect(migrateCart(old, 1).lines[0]).toMatchObject({ syrupId: null, syrupPumps: 0 })
    expect(migrateCart(old, 1).lines[0]).not.toHaveProperty('sugar')
  })
  it('changes quantity within 1..20 and removes lines', () => {
    useCart.getState().add(latte)
    useCart.getState().setQty(0, 0)
    expect(useCart.getState().lines[0].qty).toBe(1)
    useCart.getState().setQty(0, 99)
    expect(useCart.getState().lines[0].qty).toBe(20)
    useCart.getState().remove(0)
    expect(useCart.getState().lines).toHaveLength(0)
  })
})
