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
  it('stores deposit proof in the private bucket under the customer and order', async () => {
    const sb = fake({
      'select:orders': (s: any) => s.maybeSingle
        ? { data: { id: 'order-uuid' }, error: null }
        : { data: [{ id: 'order-uuid' }], error: null },
    })
    const upload = vi.fn(async (_path: string, _file: File, _options: Record<string, unknown>) => ({ data: { path: '' }, error: null }))
    const createSignedUrl = vi.fn(async (_path: string, _expires: number) => ({ data: { signedUrl: 'signed-proof-url' }, error: null }))
    sb.storage = { from: vi.fn((bucket: string) => {
      expect(bucket).toBe('deposit-images')
      return { upload, createSignedUrl }
    }) }
    const url = await createSupabaseRepos(sb, () => 'customer-uuid').orders.uploadDepositImage(
      200, new File(['proof'], 'deposit.png', { type: 'image/png' }),
    )
    expect(upload.mock.calls[0][0]).toBe('customer-uuid/order-uuid/proof')
    expect(upload.mock.calls[0][2]).toMatchObject({ contentType: 'image/png', upsert: true })
    expect(createSignedUrl).toHaveBeenCalledWith('customer-uuid/order-uuid/proof', 3600)
    expect(url).toBe('signed-proof-url')
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
  it('persists order archiving and updates the returned order', async () => {
    let archived = false
    const sb = fake({
      'select:orders': (s: any) => {
        if (s.update) archived = s.update[0].archived
        return { data: s.update || s.maybeSingle ? row({ archived }) : [row({ archived })], error: null }
      },
    })
    const r = createSupabaseRepos(sb, () => 'me')
    await r.orders.listAll()
    await expect(r.orders.setArchived(200, true)).resolves.toMatchObject({ n: 200, archived: true })
    expect(await r.orders.listAll()).toMatchObject([{ archived: true }])
  })
  it('loads every page of the staff order history', async () => {
    let pages = 0
    const sb = fake({
      'select:orders': (s: any) => {
        pages++
        return { data: s.range[0] === 0
          ? Array.from({ length: 500 }, (_, i) => row({ number: 1000 - i }))
          : [row({ number: 500 })], error: null }
      },
    })
    const orders = await createSupabaseRepos(sb, () => 'me').orders.listAll()
    expect(orders).toHaveLength(501)
    expect(pages).toBe(2)
  })
  it('loads milk and syrup choices into each order item summary', async () => {
    let projection = ''
    const sb = fake({
      'select:orders': (s: any) => {
        projection = s.select[0]
        return { data: [row({ order_items: [{ item_id: 'latte', qty: 1, is_reward: false, milk: 2, syrup_id: 'vanilla', syrup_pumps: 1 }] })], error: null }
      },
    })
    const [order] = await createSupabaseRepos(sb, () => 'me').orders.listAll()
    expect(order.items[0]).toMatchObject({ milk: 2, syrupId: 'vanilla', syrupPumps: 1 })
    expect(projection).toContain('milk')
  })
  it('marks orders with a deposit proof for the staff order cards', async () => {
    const sb = fake({
      'select:orders': () => ({ data: [row({ deposit_image_path: 'customer/order/proof' })], error: null }),
    })
    const [order] = await createSupabaseRepos(sb, () => 'staff').orders.listAll()
    expect(order.hasDepositImage).toBe(true)
  })
  it('archives all orders through the staff-only RPC and updates its cache', async () => {
    let archived = false
    const rpc = vi.fn(async (_name: string) => { archived = true; return { data: 2, error: null } })
    const sb = fake({ 'select:orders': () => ({ data: [row({ number: 200, archived }), row({ number: 199, archived })], error: null }) })
    sb.rpc = rpc
    const orders = createSupabaseRepos(sb, () => 'me').orders
    await orders.listAll()
    await expect(orders.archiveAll()).resolves.toBe(2)
    expect(rpc.mock.calls[0][0]).toBe('archive_all_orders')
    expect(await orders.listAll()).toMatchObject([{ archived: true }, { archived: true }])
  })
  it('confirms delivery via the customer RPC and reloads the completed order', async () => {
    const rpc = vi.fn(async (_name: string, args: { p_order_number: number }) => ({
      data: { id: 'u1', number: args.p_order_number }, error: null,
    }))
    const sb = fake({
      'select:orders': (s: any) => ({
        data: s.single ? row({ status: 'done' }) : [row({ status: 'out', mode: 'delivery' })],
        error: null,
      }),
    })
    sb.rpc = rpc
    const result = await createSupabaseRepos(sb, () => 'me').orders.confirmDelivery(200)
    expect(rpc.mock.calls[0]).toEqual(['confirm_delivery', { p_order_number: 200 }])
    expect(result).toMatchObject({ n: 200, status: 'done' })
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
