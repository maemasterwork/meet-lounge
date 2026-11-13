import { describe, expect, it } from 'vitest'
import { createMockRepos } from './mock'
import { OrderError } from './types'

const latte = { itemId: 'latte', size: 'small', milk: 0, sugar: 1, qty: 1, free: false }

describe('mock repos', () => {
  it('places an order, advances it, and awards one coin on done', async () => {
    const r = createMockRepos()
    expect(await r.coins.balance()).toBe(5)
    const o = await r.orders.place({ lines: [latte], mode: 'pickup' })
    expect(o.total).toBe(115000) // active 15% offer on latte
    for (let i = 0; i < 3; i++) await r.orders.advance(o.n)
    expect((await r.orders.listMine())[0].status).toBe('done')
    expect(await r.coins.balance()).toBe(6)
    await r.orders.advance(o.n) // no-op after done
    expect(await r.coins.balance()).toBe(6)
  })
  it('spends N coins for a reward line and refunds on cancel', async () => {
    const r = createMockRepos()
    const earn = await r.orders.place({ lines: [latte], mode: 'pickup' })
    for (let i = 0; i < 3; i++) await r.orders.advance(earn.n)
    const o = await r.orders.place({ lines: [{ ...latte, free: true }], mode: 'pickup' })
    expect(o.total).toBe(0)
    expect(await r.coins.balance()).toBe(0)
    await r.orders.cancel(o.n)
    expect(await r.coins.balance()).toBe(6)
  })
  it('rejects bad orders with a code', async () => {
    const r = createMockRepos()
    await expect(r.orders.place({ lines: [], mode: 'pickup' })).rejects.toMatchObject({ code: 'empty' })
    await expect(r.orders.place({ lines: [latte], mode: 'delivery', address: '  ' })).rejects.toBeInstanceOf(OrderError)
    await expect(r.orders.place({ lines: [{ ...latte, free: true }], mode: 'pickup' })).rejects.toMatchObject({ code: 'not-enough-coins' })
    await r.menu.setAvailable('latte', false)
    await expect(r.orders.place({ lines: [latte], mode: 'pickup' })).rejects.toMatchObject({ code: 'item-unavailable' })
  })
  it('adds the delivery fee and keeps the address', async () => {
    const r = createMockRepos()
    const o = await r.orders.place({ lines: [latte], mode: 'delivery', address: ' Valiasr St ' })
    expect(o.fee).toBe(30000)
    expect(o.address).toBe('Valiasr St')
  })
})
