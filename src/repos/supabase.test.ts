import { describe, expect, it, vi } from 'vitest'
import { createSupabaseRepos } from './supabase'
import { OrderError } from './types'

/** A tiny fake of the parts of supabase-js the repos use: enough to test error mapping and optimistic rollback. */
function fake(handlers: Record<string, (args?: any) => any>) {
  const q = (table: string): any => {
    const state: any = { table }
    const chain: any = new Proxy({}, { get: (_t, k: string) => {
      if (k === 'then') return (res: any) => res(handlers[`select:${table}`]?.(state) ?? { data: [], error: null })
      return (...a: any[]) => { state[k] = a; return chain }
    } })
    return chain
  }
  return { from: q, rpc: async (name: string, args: any) => handlers[name]?.(args) ?? { data: null, error: null }, channel: () => ({ on() { return this }, subscribe() {} }) } as any
}
const row = (o: any = {}) => ({ id: 'u1', number: 200, mode: 'pickup', customer_id: 'me', subtotal: 100, delivery_fee: 0, total: 100, status: 'new', created_at: '2026-01-01', order_items: [], profiles: { display_name: 'Me' }, ...o })

describe('supabase repos', () => {
  it('maps database error messages to OrderError codes', async () => {
    const r = createSupabaseRepos(fake({ create_order: () => ({ data: null, error: { message: 'not-enough-coins' } }) }), () => 'me')
    await expect(r.orders.place({ lines: [], mode: 'pickup' })).rejects.toMatchObject({ code: 'not-enough-coins' })
    await expect(r.orders.place({ lines: [], mode: 'pickup' })).rejects.toBeInstanceOf(OrderError)
  })
  it('never sends a price to the server', async () => {
    const rpc = vi.fn(async () => ({ data: row(), error: null }))
    const sb = fake({}); sb.rpc = rpc
    const r = createSupabaseRepos(sb, () => 'me')
    await r.orders.place({ lines: [{ itemId: 'latte', size: 'small', milk: 0, syrupId: null, syrupPumps: 0, qty: 2, free: false }], mode: 'pickup' }).catch(() => {})
    const payload = JSON.stringify(rpc.mock.calls[0])
    expect(payload).not.toMatch(/price|total|subtotal/i)
  })
  it('rolls the optimistic status back when the server refuses', async () => {
    const sb = fake({
      'select:orders': (s: any) => (s.single || s.maybeSingle ? { data: { id: 'u1' }, error: null } : { data: [row()], error: null }),
      advance_order: () => ({ data: null, error: { message: 'not-allowed' } }),
    })
    const r = createSupabaseRepos(sb, () => 'me')
    const seen: string[] = []
    r.orders.subscribe(async () => { seen.push((await r.orders.listAll()).find(() => true)!.status) })
    await r.orders.listAll()
    await expect(r.orders.advance(200)).rejects.toMatchObject({ code: 'not-allowed' })
    const after = await r.orders.listAll()
    expect(after[0].status).toBe('new')
  })
  it('persists item order using the menu sort column', async () => {
    const updates: Array<{ id: string; sort: number }> = []
    const sb = fake({
      'select:menu_items': (s: any) => {
        updates.push({ id: s.eq[1], sort: s.update[0].sort })
        return { data: [{ id: s.eq[1] }], error: null }
      },
    })
    const r = createSupabaseRepos(sb, () => 'me')
    await r.admin.reorderItems(['latte', 'espresso'])
    expect(updates).toEqual([{ id: 'latte', sort: 0 }, { id: 'espresso', sort: 1 }])
  })
  it('saves multiple menu item patches in parallel', async () => {
    const updates: Array<{ id: string; values: Record<string, unknown> }> = []
    const sb = fake({
      'select:menu_items': (s: any) => {
        updates.push({ id: s.eq[1], values: s.update[0] })
        return { data: [{ id: s.eq[1] }], error: null }
      },
    })
    const r = createSupabaseRepos(sb, () => 'me')
    await r.admin.saveItems([
      { id: 'latte', patch: { price: 210000 } },
      { id: 'espresso', patch: { available: false } },
    ])
    expect(updates).toContainEqual({ id: 'latte', values: { base_price: 210000 } })
    expect(updates).toContainEqual({ id: 'espresso', values: { available: false } })
  })
  it('persists syrup availability when adding a menu item', async () => {
    let inserted: Record<string, unknown> | undefined
    const sb = fake({
      'select:menu_items': (s: any) => {
        if (s.insert) { inserted = s.insert[0]; return { data: [{ id: s.insert[0].id }], error: null } }
        return { data: [{ sort: 1 }], error: null }
      },
    })
    const r = createSupabaseRepos(sb, () => 'me')
    await r.admin.addItem({
      name: { fa: 'لاته', en: 'Latte' }, desc: { fa: '', en: '' }, cat: 'hot', price: 100000,
      milk: false, syrupOptions: true, rewardEligible: false,
    })
    expect(inserted?.syrup_options).toBe(true)
  })
})
