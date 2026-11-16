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
    await expect(r.orders.advance(o.n)).rejects.toMatchObject({ code: 'deposit-required' })
    await r.orders.markPaid(o.n)
    for (let i = 0; i < 3; i++) await r.orders.advance(o.n)
    expect((await r.orders.listMine())[0].status).toBe('done')
    expect(await r.coins.balance()).toBe(6)
    await r.orders.advance(o.n) // no-op after done
    expect(await r.coins.balance()).toBe(6)
  })
  it('spends N coins for a reward line and refunds on cancel', async () => {
    const r = createMockRepos()
    const earn = await r.orders.place({ lines: [latte], mode: 'pickup' })
    await r.orders.markPaid(earn.n)
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
  it('earns each item\'s own coins per unit, and none for reward lines', async () => {
    const r = createMockRepos()
    await r.admin.saveItem('latte', { coinsEarned: 3 })
    const o = await r.orders.place({ lines: [{ ...latte, qty: 2 }], mode: 'pickup' })
    expect(o.items[0].coin).toBe(3)
    await r.admin.saveItem('latte', { coinsEarned: 9 })                // later changes do not affect this order
    await r.orders.markPaid(o.n)
    for (let i = 0; i < 3; i++) await r.orders.advance(o.n)
    expect(await r.coins.balance()).toBe(5 + 6)
  })
  it('charges each reward its own coin price', async () => {
    const r = createMockRepos()
    await r.admin.saveItem('latte', { rewardCost: 4 })
    await r.orders.place({ lines: [{ ...latte, free: true }], mode: 'pickup' })
    expect(await r.coins.balance()).toBe(1)
    await r.admin.saveItem('latte', { rewardCost: 9 })
    await expect(r.orders.place({ lines: [{ ...latte, free: true }], mode: 'pickup' })).rejects.toMatchObject({ code: 'not-enough-coins' })
  })
  it('limited stock is taken at checkout, refused when short, returned on cancel', async () => {
    const r = createMockRepos()
    await r.admin.saveItem('latte', { stock: 3 })
    const o = await r.orders.place({ lines: [{ ...latte, qty: 2 }], mode: 'pickup' })
    expect((await r.menu.list()).find((m) => m.id === 'latte')!.stock).toBe(1)
    await expect(r.orders.place({ lines: [{ ...latte, qty: 2 }], mode: 'pickup' })).rejects.toMatchObject({ code: 'out-of-stock' })
    await r.orders.cancel(o.n); await r.orders.cancel(o.n)
    expect((await r.menu.list()).find((m) => m.id === 'latte')!.stock).toBe(3)
    await r.admin.saveItem('latte', { stock: 0 })
    await expect(r.orders.place({ lines: [latte], mode: 'pickup' })).rejects.toMatchObject({ code: 'out-of-stock' })
    await r.admin.saveItem('latte', { stock: null })
    await expect(r.orders.place({ lines: [{ ...latte, qty: 20 }], mode: 'pickup' })).resolves.toBeDefined()
  })
  it('reorders menu items persistently in the mock repository', async () => {
    const r = createMockRepos()
    const ids = (await r.admin.items()).map((item) => item.id)
    await r.admin.reorderItems([ids[1], ids[0], ...ids.slice(2)])
    expect((await r.menu.list()).map((item) => item.id)).toEqual([ids[1], ids[0], ...ids.slice(2)])
  })
  it('saves several item edits together in the mock repository', async () => {
    const r = createMockRepos()
    await r.admin.saveItems([
      { id: 'latte', patch: { price: 210000 } },
      { id: 'espresso', patch: { available: false } },
    ])
    const items = await r.admin.items()
    expect(items.find((item) => item.id === 'latte')?.price).toBe(210000)
    expect(items.find((item) => item.id === 'espresso')?.available).toBe(false)
  })
})
