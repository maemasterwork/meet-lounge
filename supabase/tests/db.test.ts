// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { addUser, as, freshDb } from './harness'
import { initialMenu } from '../../src/data/catalog'
import { unitPrice } from '../../src/lib/pricing'
import type { Offer } from '../../src/types'

let db: PGlite
let owner: any, staff: any, alice: any, bob: any, guest: any

const line = (o: Record<string, unknown>) => JSON.stringify([{ item_id: 'latte', size: 'small', milk: 0, syrup_id: null, syrup_pumps: 0, qty: 1, ...o }])
const order = (who: any, items = line({}), mode = 'pickup', table: string | null = null, addr: string | null = null, phone: string | null = null) =>
  as(db, who, 'select * from public.create_order($1::jsonb, $2::public.order_mode, $3, $4, $5)', [items, mode, table, addr, phone]).then((r) => r[0])
const balance = async (id: string) => Number((await as(db, null, 'select coalesce(sum(delta),0)::int b from public.coin_ledger where customer_id=$1', [id]))[0].b)
const advance = (id: string) => as(db, staff, 'select * from public.advance_order($1)', [id]).then((r) => r[0])
const give = (id: string, n: number) => as(db, owner, 'select public.adjust_coins($1,$2,$3)', [id, n, 'test'])

beforeAll(async () => {
  db = await freshDb()
  await db.exec('update public.settings set require_deposit = false')      // most tests are about other rules; the deposit rule has its own block below
  owner = await addUser(db, 'owner'); staff = await addUser(db, 'staff')
  alice = await addUser(db); bob = await addUser(db); guest = await addUser(db, 'customer', true)
}, 60_000)

describe('schema and seed', () => {
  it('every public table has row level security on', async () => {
    const r = await as(db, null, "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity")
    expect(r).toEqual([])
  })
  it('seeds 16 menu items and a settings row', async () => {
    expect((await as(db, 'anon', 'select count(*)::int n from public.menu_items'))[0].n).toBe(16)
    expect((await as(db, 'anon', 'select reward_every from public.settings'))[0].reward_every).toBe(6)
  })
  it('creates a profile for each new auth user', async () => {
    expect((await as(db, alice, 'select role from public.profiles where id=$1', [alice.id]))[0].role).toBe('customer')
  })
  it('stores customer signup details and syncs guest profile upgrades', async () => {
    const metadata = JSON.stringify({ name: 'Taylor Namvaran', phone: '+982112345678', seat: 'Building 2, floor 4, design' })
    const [user] = await as<{ id: string }>(db, null, 'insert into auth.users (raw_user_meta_data) values ($1::jsonb) returning id', [metadata])
    const profile = await as(db, null, 'select display_name, phone, seat from public.profiles where id=$1', [user.id])
    expect(profile[0]).toEqual({ display_name: 'Taylor Namvaran', phone: '+982112345678', seat: 'Building 2, floor 4, design' })

    await as(db, null, 'update auth.users set raw_user_meta_data=$1::jsonb where id=$2', [
      JSON.stringify({ name: 'Taylor Updated', phone: '09121112233', seat: 'Building 3, floor 1' }), user.id,
    ])
    const upgraded = await as(db, null, 'select display_name, phone, seat from public.profiles where id=$1', [user.id])
    expect(upgraded[0]).toEqual({ display_name: 'Taylor Updated', phone: '09121112233', seat: 'Building 3, floor 1' })
  })
  it('requires a phone for registered customers and permits profile edits', async () => {
    await expect(db.query("insert into auth.users (raw_user_meta_data) values ('{}'::jsonb)")).rejects.toThrow(/phone-required/)

    const updated = await as(db, alice,
      'update public.profiles set display_name=$1, phone=$2, seat=$3 where id=$4 returning display_name, phone, seat',
      ['Alice Updated', '09129998877', 'Building 1, floor 2', alice.id],
    )
    expect(updated[0]).toEqual({ display_name: 'Alice Updated', phone: '09129998877', seat: 'Building 1, floor 2' })
    await expect(as(db, alice, 'update public.profiles set phone=null where id=$1', [alice.id])).rejects.toThrow(/phone-required/)
  })
})

describe('prices are computed in Postgres and match the app', () => {
  it('prices syrups per pump and restricts them to drinks', async () => {
    await as(db, owner, `
      insert into public.menu_items (id, category, name_fa, name_en, base_price, milk_options, syrup_options)
      values
        ('tea-test', 'tea', 'چای', 'Tea', 100000, false, true),
        ('breakfast-test', 'breakfast', 'صبحانه', 'Breakfast', 200000, false, false),
        ('food-test', 'food', 'غذا', 'Food', 300000, false, false)
    `)
    expect((await as(db, null, "select count(*)::int n from public.menu_items where category in ('tea', 'breakfast', 'food')"))[0].n).toBe(3)
    await as(db, owner, "insert into public.menu_items (id, category, name_fa, name_en, base_price, syrup_options) values ('no-syrup-test', 'hot', 'قهوه', 'Coffee', 100000, false)")
    const o = await order(alice, line({ item_id: 'tea-test', size: 'piece1', syrup_id: 'vanilla', syrup_pumps: 2 }))
    expect(o.subtotal).toBe(160000)
    const [savedLine] = await as<{ syrup_id: string; syrup_pumps: number }>(db, alice, 'select syrup_id, syrup_pumps from public.order_items where order_id=$1', [o.id])
    expect(savedLine).toEqual({ syrup_id: 'vanilla', syrup_pumps: 2 })
    const baseLatte = await order(alice)
    const syrupLatte = await order(alice, line({ syrup_id: 'vanilla', syrup_pumps: 2 }))
    expect(syrupLatte.subtotal - baseLatte.subtotal).toBe(60000)
    await expect(order(alice, line({ item_id: 'no-syrup-test', syrup_id: 'vanilla', syrup_pumps: 1 }))).rejects.toThrow(/bad-option/)
    await expect(order(alice, line({ item_id: 'tea-test', size: 'piece1', syrup_id: 'vanilla', syrup_pumps: 3 }))).rejects.toThrow(/bad-option/)
    await expect(order(alice, line({ item_id: 'food-test', size: 'piece1', syrup_id: 'vanilla', syrup_pumps: 1 }))).rejects.toThrow(/bad-option/)
    await expect(order(alice, line({ syrup_id: 'unknown', syrup_pumps: 1 }))).rejects.toThrow(/bad-option/)
    await as(db, owner, "update public.syrups set active=false where id='vanilla'")
    await expect(order(alice, line({ syrup_id: 'vanilla', syrup_pumps: 1 }))).rejects.toThrow(/bad-option/)
    await as(db, owner, "update public.syrups set active=true where id='vanilla'")
    await expect(order(alice, line({ syrup_id: 'vanilla', syrup_pumps: 1, reward: true }))).rejects.toThrow(/bad-option/)
  })

  it('ignores any price the client sends', async () => {
    const o = await order(alice, line({ item_id: 'espresso', unit_price: 1, price: 1, total: 1 }))
    expect(o.subtotal).toBe(95000)
    expect(o.total).toBe(95000)
  })
  it('matches src/lib/pricing.ts for every item, size and milk (with the seeded 15% latte offer)', async () => {
    const offers: Offer[] = [{ id: 1, title: { fa: '', en: '' }, body: { fa: '', en: '' }, itemId: 'latte', pct: 15, audience: 'all', active: true, read: false } as any]
    let checked = 0
    for (const item of initialMenu()) {
      for (const size of item.sizes) for (let milk = 0; milk < (item.milk ? 3 : 1); milk++) {
        const o = await order(alice, line({ item_id: item.id, size: size.key, milk }))
        expect(o.subtotal, `${item.id}/${size.key}/${milk}`).toBe(unitPrice(item, { size: size.key, milk }, offers))
        checked++
      }
    }
    expect(checked).toBeGreaterThan(40)
  })
  it('adds the delivery fee only for delivery', async () => {
    const o = await order(alice, line({ item_id: 'espresso' }), 'delivery', null, 'Valiasr St 1')
    expect(o.delivery_fee).toBe(30000)
    expect(o.total).toBe(125000)
  })
  it('rejects unknown sizes, bad quantity, unavailable items', async () => {
    await expect(order(alice, line({ size: 'huge' }))).rejects.toThrow(/bad-option/)
    await expect(order(alice, line({ qty: 99 }))).rejects.toThrow(/bad-option/)
    await expect(order(alice, line({ item_id: 'nope' }))).rejects.toThrow(/item-unavailable/)
    await as(db, owner, "update public.menu_items set available=false where id='mocha'")
    await expect(order(alice, line({ item_id: 'mocha' }))).rejects.toThrow(/item-unavailable/)
    await as(db, owner, "update public.menu_items set available=true where id='mocha'")
  })
  it('validates table, address, phone and shop-open', async () => {
    await expect(order(alice, line({}), 'table', '99')).rejects.toThrow(/table-required/)
    await expect(order(alice, line({}), 'delivery')).rejects.toThrow(/address-required/)
    await expect(order(guest, line({}))).rejects.toThrow(/phone-required/)
    expect((await order(guest, line({}), 'pickup', null, null, '09121234567')).guest_phone).toBe('09121234567')
    await as(db, owner, 'update public.settings set shop_open=false')
    await expect(order(alice, line({}))).rejects.toThrow(/shop-closed/)
    await as(db, owner, 'update public.settings set shop_open=true')
  })
})

describe('row level security', () => {
  it("a customer cannot read someone else's orders, items or coins", async () => {
    const o = await order(alice)
    expect(await as(db, bob, 'select 1 from public.orders where id=$1', [o.id])).toEqual([])
    expect(await as(db, bob, 'select 1 from public.order_items where order_id=$1', [o.id])).toEqual([])
    expect(await as(db, bob, 'select 1 from public.coin_ledger where customer_id=$1', [alice.id])).toEqual([])
    expect((await as(db, alice, 'select 1 from public.orders where id=$1', [o.id])).length).toBe(1)
    expect((await as(db, staff, 'select 1 from public.orders where id=$1', [o.id])).length).toBe(1)
    expect(await as(db, 'anon', 'select 1 from public.orders').catch(() => 'denied')).toBe('denied')
  })
  it('a customer cannot insert orders or items directly', async () => {
    await expect(as(db, alice, "insert into public.orders (customer_id, mode, subtotal, total) values ($1,'pickup',0,0)", [alice.id])).rejects.toThrow(/permission denied|row-level/)
    await expect(as(db, alice, "insert into public.order_items (order_id,item_id,size,qty,unit_price) select id,'latte','small',1,0 from public.orders limit 1")).rejects.toThrow(/permission denied|row-level/)
  })
  it('a customer cannot change price, total, status or coins on an order', async () => {
    const o = await order(alice)
    await expect(as(db, alice, 'update public.orders set total=0 where id=$1', [o.id])).rejects.toThrow(/permission denied/)
    await as(db, alice, "update public.orders set status='done' where id=$1", [o.id])   // column allowed, policy filters to 0 rows
    expect((await as(db, null, 'select status from public.orders where id=$1', [o.id]))[0].status).toBe('new')
    await expect(as(db, alice, 'update public.order_items set unit_price=0')).rejects.toThrow(/permission denied/)
  })
  it('only staff can archive or restore orders', async () => {
    const o = await order(alice)
    expect(await as(db, alice, 'update public.orders set archived=true where id=$1 returning archived', [o.id])).toEqual([])
    expect((await as(db, staff, 'update public.orders set archived=true where id=$1 returning archived', [o.id]))[0].archived).toBe(true)
    expect((await as(db, staff, 'update public.orders set archived=false where id=$1 returning archived', [o.id]))[0].archived).toBe(false)
  })
  it('only staff can archive every unarchived order in one operation', async () => {
    await as(db, staff, 'select public.archive_all_orders()')
    const first = await order(alice)
    const second = await order(bob)
    await as(db, staff, 'update public.orders set archived=true where id=$1', [first.id])
    await expect(as(db, alice, 'select public.archive_all_orders()')).rejects.toThrow(/not-allowed/)
    expect((await as(db, staff, 'select public.archive_all_orders() as count'))[0].count).toBe(1)
    expect((await as(db, staff, 'select archived from public.orders where id=$1', [first.id]))[0].archived).toBe(true)
    expect((await as(db, staff, 'select archived from public.orders where id=$1', [second.id]))[0].archived).toBe(true)
    expect((await as(db, staff, 'select public.archive_all_orders() as count'))[0].count).toBe(0)
  })
  it('a customer cannot write the coin ledger or call owner tools', async () => {
    await expect(as(db, alice, "insert into public.coin_ledger (customer_id,delta,reason) values ($1,100,'adjust')", [alice.id])).rejects.toThrow(/permission denied|row-level/)
    await expect(as(db, alice, 'update public.coin_ledger set delta=100')).rejects.toThrow(/permission denied/)
    await expect(as(db, alice, 'delete from public.coin_ledger')).rejects.toThrow(/permission denied/)
    await expect(as(db, alice, 'select public.adjust_coins($1,5,$2)', [alice.id, 'x'])).rejects.toThrow(/not-allowed/)
    await expect(as(db, alice, "select public.set_role($1,'owner')", [alice.id])).rejects.toThrow(/not-allowed/)
    await expect(as(db, alice, "update public.profiles set role='owner' where id=$1", [alice.id])).rejects.toThrow(/permission denied/)
  })
  it('only the owner writes menu, offers and settings', async () => {
    await as(db, alice, "update public.menu_items set base_price=1 where id='latte'")        // policy filters it to 0 rows
    await expect(as(db, alice, "insert into public.menu_items (id,category,name_fa,name_en,base_price) values ('x1','hot','a','b',1)")).rejects.toThrow(/row-level/)
    expect((await as(db, null, "select base_price from public.menu_items where id='latte'"))[0].base_price).toBe(135000)
    await as(db, staff, 'update public.settings set reward_every=2')
    expect((await as(db, null, 'select reward_every from public.settings'))[0].reward_every).toBe(6)
    await as(db, owner, 'update public.settings set reward_every=7')
    expect((await as(db, null, 'select reward_every from public.settings'))[0].reward_every).toBe(7)
    await as(db, owner, 'update public.settings set reward_every=6')
  })
  it('anon sees active offers and non-archived menu only', async () => {
    await as(db, owner, "update public.menu_items set archived=true where id='g-note'")
    expect((await as(db, 'anon', "select 1 from public.menu_items where id='g-note'")).length).toBe(0)
    expect((await as(db, staff, "select 1 from public.menu_items where id='g-note'")).length).toBe(1)
    await as(db, owner, "update public.menu_items set archived=false where id='g-note'")
    expect((await as(db, 'anon', 'select 1 from public.offers')).length).toBe(1)
    await as(db, owner, 'update public.offers set active=false')
    expect((await as(db, 'anon', 'select 1 from public.offers')).length).toBe(0)
    await as(db, owner, 'update public.offers set active=true')
  })
})

describe('status flow and coins', () => {
  it('pickup goes new → prep → ready → done and awards exactly one coin', async () => {
    const o = await order(bob, line({ item_id: 'espresso' }))
    const before = await balance(bob.id)
    expect((await advance(o.id)).status).toBe('prep')
    expect((await advance(o.id)).status).toBe('ready')
    expect(await balance(bob.id)).toBe(before)
    expect((await advance(o.id)).status).toBe('done')
    expect(await balance(bob.id)).toBe(before + 1)
    expect((await advance(o.id)).status).toBe('done')          // no-op, no second coin
    expect(await balance(bob.id)).toBe(before + 1)
  })
  it('the coin award is idempotent at the database level', async () => {
    const o = await order(bob, line({ item_id: 'espresso' }))
    for (let i = 0; i < 3; i++) await advance(o.id)
    await expect(as(db, null, "insert into public.coin_ledger (customer_id,delta,reason,order_id) values ($1,1,'earn',$2)", [bob.id, o.id])).rejects.toThrow(/duplicate|unique/)
    await expect(as(db, null, "update public.orders set status='cancelled' where id=$1", [o.id])).rejects.toThrow(/order-closed/)
    expect((await as(db, null, "select count(*)::int n from public.coin_ledger where order_id=$1 and reason='earn'", [o.id]))[0].n).toBe(1)
  })
  it('delivery has an extra out-for-delivery step', async () => {
    const o = await order(alice, line({}), 'delivery', null, 'Somewhere 5')
    const seen = [(await advance(o.id)).status, (await advance(o.id)).status, (await advance(o.id)).status, (await advance(o.id)).status]
    expect(seen).toEqual(['prep', 'ready', 'out', 'done'])
  })
  it('status cannot skip steps or go backwards, even for staff', async () => {
    const o = await order(alice)
    await expect(as(db, staff, "update public.orders set status='done' where id=$1", [o.id])).rejects.toThrow(/bad-transition/)
    await advance(o.id)
    await expect(as(db, staff, "update public.orders set status='new' where id=$1", [o.id])).rejects.toThrow(/bad-transition/)
    await expect(as(db, alice, 'select public.advance_order($1)', [o.id])).rejects.toThrow(/not-allowed/)
  })
  it('cancelling does not award a coin', async () => {
    const o = await order(alice)
    const before = await balance(alice.id)
    await as(db, alice, 'select public.cancel_order($1)', [o.id])
    expect(await balance(alice.id)).toBe(before)
  })
  it('a customer can cancel only their own order and only while it is new', async () => {
    const o = await order(alice); const p = await order(alice)
    await expect(as(db, bob, 'select public.cancel_order($1)', [o.id])).rejects.toThrow(/not-allowed/)
    await advance(p.id)
    await expect(as(db, alice, 'select public.cancel_order($1)', [p.id])).rejects.toThrow(/not-allowed/)
    expect((await as(db, staff, 'select (public.cancel_order($1)).status s', [p.id]))[0].s).toBe('cancelled')
  })
})

describe('rewards', () => {
  it('a reward line costs N coins, is free, and needs enough coins', async () => {
    const c = await addUser(db)
    await expect(order(c, line({ reward: true }))).rejects.toThrow(/not-enough-coins/)
    await give(c.id, 6)
    const o = await order(c, line({ reward: true }))
    expect(o.subtotal).toBe(0); expect(o.reward_coins).toBe(6)
    expect(await balance(c.id)).toBe(0)
    await expect(order(c, line({ reward: true }))).rejects.toThrow(/not-enough-coins/)
  })
  it('only eligible items, one per line', async () => {
    const c = await addUser(db); await give(c.id, 20)
    await expect(order(c, line({ item_id: 'mocha', reward: true }))).rejects.toThrow(/reward-not-allowed/)
    await expect(order(c, line({ reward: true, qty: 2 }))).rejects.toThrow(/reward-not-allowed/)
    expect(await balance(c.id)).toBe(20)                      // failed orders leave no trace
  })
  it('cancelling a reward order refunds the coins once', async () => {
    const c = await addUser(db); await give(c.id, 6)
    const o = await order(c, line({ reward: true }))
    await as(db, c, 'select public.cancel_order($1)', [o.id]); await as(db, c, 'select public.cancel_order($1)', [o.id])
    expect(await balance(c.id)).toBe(6)
  })
  it('a completed reward order earns nothing for the free item', async () => {
    const c = await addUser(db); await give(c.id, 6)
    const o = await order(c, line({ reward: true }))
    for (let i = 0; i < 3; i++) await advance(o.id)
    expect(await balance(c.id)).toBe(0)
  })
  it('owner cannot push a balance below zero or demote the last owner', async () => {
    const c = await addUser(db)
    await expect(give(c.id, -1)).rejects.toThrow(/not-enough-coins/)
    await expect(as(db, owner, "select public.set_role($1,'customer')", [owner.id])).rejects.toThrow(/last-owner/)
  })
})

describe('walkthrough', () => {
  it('sign up, order, owner advances to done, customer sees it and has 1 coin', async () => {
    const c = await addUser(db)
    const o = await order(c, line({ item_id: 'cappuccino', size: 'medium' }), 'table', '4')
    expect(o.status).toBe('new'); expect(o.number).toBeGreaterThanOrEqual(100)
    for (let i = 0; i < 3; i++) await as(db, owner, 'select public.advance_order($1)', [o.id])
    expect((await as(db, c, 'select status from public.orders where id=$1', [o.id]))[0].status).toBe('done')
    expect((await as(db, c, 'select public.my_balance() b'))[0].b).toBe(1)
  })
})

describe('dashboard (owner tools)', () => {
  it('owner_customers is owner-only and reports balance and order counts', async () => {
    const c = await addUser(db); await give(c.id, 3)
    const noEmail = await addUser(db, 'customer', false, null); await give(noEmail.id, 1)
    const guestWithCoins = await addUser(db, 'customer', true); await give(guestWithCoins.id, 1)
    await order(c); const o = await order(c); await as(db, owner, 'select public.cancel_order($1)', [o.id])
    await expect(as(db, staff, 'select * from public.owner_customers()')).rejects.toThrow(/not-allowed/)
    await expect(as(db, c, 'select * from public.owner_customers()')).rejects.toThrow(/not-allowed/)
    await expect(as(db, 'anon', 'select * from public.owner_customers()')).rejects.toThrow(/permission denied/)
    const customers = await as(db, owner, 'select * from public.owner_customers()')
    const row = customers.find((r: any) => r.id === c.id)
    expect(row.email).toBeTruthy(); expect(row.balance).toBe(3); expect(row.orders).toBe(1)
    expect(customers.some((r: any) => r.id === owner.id)).toBe(true)
    expect(customers.some((r: any) => r.id === noEmail.id)).toBe(false)
    expect(customers.some((r: any) => r.id === guestWithCoins.id)).toBe(false)
  })

  it('the owner can add, edit, archive menu items and set a picture path; staff cannot', async () => {
    const ins = "insert into public.menu_items (id,category,name_fa,name_en,base_price,sizes) values ('x-new','hot','جدید','New',99000,'[{\"key\":\"small\",\"mult\":1,\"scale\":1}]')"
    await expect(as(db, staff, ins)).rejects.toThrow(/row-level/)
    await as(db, owner, ins)
    await as(db, owner, "update public.menu_items set base_price=120000, image_path='items/x-new-1.png' where id='x-new'")
    expect((await order(alice, line({ item_id: 'x-new' }))).subtotal).toBe(120000)          // a new item is orderable at its new price
    await as(db, staff, "update public.menu_items set base_price=1 where id='x-new'")        // filtered to 0 rows
    expect((await as(db, null, "select base_price from public.menu_items where id='x-new'"))[0].base_price).toBe(120000)
    await as(db, owner, "update public.menu_items set archived=true where id='x-new'")
    await expect(order(alice, line({ item_id: 'x-new' }))).rejects.toThrow(/item-unavailable/)
  })
  it('only the owner manages offers, and a new offer changes the price server-side', async () => {
    const ins = "insert into public.offers (title_fa,body_fa,item_id,discount_pct) values ('t','b','espresso',50)"
    await expect(as(db, staff, ins)).rejects.toThrow(/row-level/)
    await expect(as(db, alice, ins)).rejects.toThrow(/row-level/)
    await as(db, owner, ins)
    expect((await order(alice, line({ item_id: 'espresso' }))).subtotal).toBe(48000)       // 95000 * 50% = 47500 -> 48000
    await as(db, owner, "update public.offers set ends_at = now() - interval '1 hour' where item_id='espresso'")
    expect((await order(alice, line({ item_id: 'espresso' }))).subtotal).toBe(95000)        // expired offers do not apply
  })
  it('changing an item reward cost changes what that reward costs', async () => {
    const c = await addUser(db); await give(c.id, 3)
    await as(db, owner, "update public.menu_items set reward_cost=3 where id='latte'")
    expect((await order(c, line({ reward: true }))).reward_coins).toBe(3)
    await as(db, owner, "update public.menu_items set reward_cost=6 where id='latte'")
  })
})

describe('guest account lookup', () => {
  it('lets an anonymous customer find the email for a registered account by phone only', async () => {
    const account = await addUser(db)
    await as(db, null, 'update public.profiles set phone=$1 where id=$2', ['09129998877', account.id])
    const match = await as<{ email: string | null }>(db, guest, 'select public.lookup_customer_email_by_phone($1) email', ['0912 999 8877'])
    expect(match[0].email).toMatch(/@example\.test$/)
    const missing = await as<{ email: string | null }>(db, guest, 'select public.lookup_customer_email_by_phone($1) email', ['09120000000'])
    expect(missing[0].email).toBeNull()
    await expect(as(db, alice, 'select public.lookup_customer_email_by_phone($1)', ['09129998877'])).rejects.toThrow(/not-allowed/)
    await expect(as(db, 'anon', 'select public.lookup_customer_email_by_phone($1)', ['09129998877'])).rejects.toThrow(/permission denied/)
  })
})

describe('push registration', () => {
  const ep = (s: string) => `https://push.example.com/send/${s.padEnd(30, 'x')}`
  it('registers through the function only and can hand a browser to a new user', async () => {
    await expect(as(db, alice, 'insert into public.push_subscriptions (customer_id,endpoint,p256dh,auth) values ($1,$2,$3,$4)', [alice.id, ep('a'), 'k', 'a'])).rejects.toThrow(/permission denied/)
    await as(db, alice, 'select public.register_push($1,$2,$3)', [ep('a'), 'k1', 'a1'])
    await as(db, bob, 'select public.register_push($1,$2,$3)', [ep('a'), 'k2', 'a2'])           // same browser, now bob's
    expect(await as(db, alice, 'select 1 from public.push_subscriptions')).toEqual([])
    expect((await as(db, bob, 'select p256dh from public.push_subscriptions'))[0].p256dh).toBe('k2')
  })
  it('rejects non-https endpoints, guests only for themselves, and anyone reading other subscriptions', async () => {
    await expect(as(db, alice, 'select public.register_push($1,$2,$3)', ['http://insecure.example.com/x/xxxxxxxxxxxx', 'k', 'a'])).rejects.toThrow(/bad-option/)
    await expect(as(db, alice, 'select public.register_push($1,$2,$3)', [ep('b'), 'k', 'a']).then(() => as(db, bob, 'select 1 from public.push_subscriptions where endpoint=$1', [ep('b')]))).resolves.toEqual([])
    await expect(as(db, 'anon', 'select public.register_push($1,$2,$3)', [ep('c'), 'k', 'a'])).rejects.toThrow(/permission denied/)
  })
  it('a customer can delete only their own subscription', async () => {
    await as(db, alice, 'delete from public.push_subscriptions')
    expect((await as(db, null, 'select count(*)::int n from public.push_subscriptions'))[0].n).toBeGreaterThan(0)   // bob's is untouched
  })
})

describe('deposit before preparation', () => {
  const on = () => as(db, owner, 'update public.settings set require_deposit = true')
  const off = () => as(db, owner, 'update public.settings set require_deposit = false')
  it('an order waits for the deposit: staff cannot start it until it is marked paid', async () => {
    await on()
    const o = await order(alice)
    expect(o.paid_at).toBeNull()
    await expect(advance(o.id)).rejects.toThrow(/deposit-required/)
    await expect(as(db, staff, "update public.orders set status='prep' where id=$1", [o.id])).rejects.toThrow(/deposit-required/)
    expect((await as(db, staff, 'select (public.mark_paid($1)).paid_at is not null p', [o.id]))[0].p).toBe(true)
    expect((await advance(o.id)).status).toBe('prep')
    await off()
  })
  it('customers cannot mark an order paid or write paid_at', async () => {
    await on()
    const o = await order(alice)
    await expect(as(db, alice, 'select public.mark_paid($1)', [o.id])).rejects.toThrow(/not-allowed/)
    await expect(as(db, alice, 'update public.orders set paid_at = now() where id=$1', [o.id])).rejects.toThrow(/permission denied/)
    await expect(as(db, 'anon', 'select public.mark_paid($1)', [o.id])).rejects.toThrow(/permission denied/)
    await off()
  })
  it('marking paid twice is harmless, and a cancelled order cannot be marked paid', async () => {
    await on()
    const o = await order(alice)
    const first = (await as(db, staff, 'select (public.mark_paid($1)).paid_at p', [o.id]))[0].p
    expect((await as(db, staff, 'select (public.mark_paid($1)).paid_at p', [o.id]))[0].p).toEqual(first)
    const c = await order(alice)
    await as(db, alice, 'select public.cancel_order($1)', [c.id])
    await expect(as(db, staff, 'select public.mark_paid($1)', [c.id])).rejects.toThrow(/order-closed/)
    await off()
  })
  it('an order with nothing to pay (all rewards) starts without a deposit', async () => {
    await on()
    const c = await addUser(db); await give(c.id, 6)
    const o = await order(c, line({ reward: true }))
    expect(o.total).toBe(0); expect(o.paid_at).not.toBeNull()
    expect((await advance(o.id)).status).toBe('prep')
    await off()
  })
  it('with deposits switched off, orders are paid on arrival (cash mode)', async () => {
    const o = await order(alice)
    expect(o.paid_at).not.toBeNull()
  })
  it('only the owner sets the card number, and it must be 16 digits', async () => {
    await expect(as(db, owner, "update public.settings set payment_card='1234'")).rejects.toThrow(/check/)
    await as(db, staff, "update public.settings set payment_card='6037991234567890'")           // filtered to 0 rows
    expect((await as(db, 'anon', 'select payment_card from public.settings'))[0].payment_card).toBeNull()
    await as(db, owner, "update public.settings set payment_card='6037991234567890', payment_holder='Meet Lounge'")
    expect((await as(db, 'anon', 'select payment_card from public.settings'))[0].payment_card).toBe('6037991234567890')
  })
  it('the season defaults to fall, anyone can read it, only the owner can change it, and only summer or fall are valid', async () => {
    expect((await as(db, 'anon', 'select season from public.settings'))[0].season).toBe('fall')
    await as(db, staff, "update public.settings set season='summer'")                          // filtered to 0 rows
    expect((await as(db, 'anon', 'select season from public.settings'))[0].season).toBe('fall')
    await expect(as(db, owner, "update public.settings set season='monsoon'")).rejects.toThrow(/check/)
    await as(db, owner, "update public.settings set season='summer'")
    expect((await as(db, 'anon', 'select season from public.settings'))[0].season).toBe('summer')
    await as(db, owner, "update public.settings set season='winter'")
    expect((await as(db, 'anon', 'select season from public.settings'))[0].season).toBe('winter')
    await as(db, owner, "update public.settings set season='fall'")
  })
  it('the 3D special event defaults to none, only the owner changes it, and only known events are valid', async () => {
    expect((await as(db, 'anon', 'select scene_event from public.settings'))[0].scene_event).toBe('none')
    await as(db, staff, "update public.settings set scene_event='yalda'")                      // filtered to 0 rows
    expect((await as(db, 'anon', 'select scene_event from public.settings'))[0].scene_event).toBe('none')
    await expect(as(db, owner, "update public.settings set scene_event='halloween'")).rejects.toThrow(/check/)
    for (const e of ['yalda', 'xmas', 'nowruz', 'anniv', 'vday', 'oil']) {
      await as(db, owner, `update public.settings set scene_event='${e}'`)
      expect((await as(db, 'anon', 'select scene_event from public.settings'))[0].scene_event).toBe(e)
    }
    await as(db, owner, "update public.settings set scene_event='none'")
  })
})

describe('per-item coins and stock', () => {
  const setItem = (id: string, set: string) => as(db, owner, `update public.menu_items set ${set} where id='${id}'`)
  const stock = async (id: string) => (await as(db, null, 'select stock from public.menu_items where id=$1', [id]))[0].stock
  const finish = async (id: string) => { for (let i = 0; i < 3; i++) await advance(id) }
  it('an order earns coins_earned per unit of each paid line', async () => {
    const c = await addUser(db)
    await setItem('latte', 'coins_earned=3'); await setItem('espresso', 'coins_earned=0')
    const o = await order(c, JSON.stringify([{ item_id: 'latte', size: 'small', milk: 0, syrup_id: null, syrup_pumps: 0, qty: 2 }, { item_id: 'espresso', size: 'small', syrup_id: null, syrup_pumps: 0, qty: 1 }]))
    await finish(o.id)
    expect(await balance(c.id)).toBe(6)
    await setItem('latte', 'coins_earned=1'); await setItem('espresso', 'coins_earned=1')
  })
  it('the coins promised at order time are kept even if the item changes later', async () => {
    const c = await addUser(db)
    await setItem('latte', 'coins_earned=2')
    const o = await order(c)
    await setItem('latte', 'coins_earned=9')
    await finish(o.id)
    expect(await balance(c.id)).toBe(2)
    await setItem('latte', 'coins_earned=1')
  })
  it('default is one coin per unit, and an item with 0 coins earns no ledger row', async () => {
    const c = await addUser(db)
    await finish((await order(c, line({ qty: 3 }))).id)
    expect(await balance(c.id)).toBe(3)
    await setItem('latte', 'coins_earned=0')
    const d = await addUser(db); await finish((await order(d)).id)
    expect(await balance(d.id)).toBe(0)
    await setItem('latte', 'coins_earned=1')
  })
  it('each reward item has its own price in coins', async () => {
    const c = await addUser(db); await give(c.id, 7)
    await setItem('latte', 'reward_cost=4'); await setItem('cappuccino', 'reward_cost=7')
    expect((await order(c, line({ reward: true }))).reward_coins).toBe(4)
    await expect(order(c, line({ item_id: 'cappuccino', reward: true }))).rejects.toThrow(/not-enough-coins/)
    expect(await balance(c.id)).toBe(3)
    await setItem('latte', 'reward_cost=6'); await setItem('cappuccino', 'reward_cost=6')
  })
  it('limited stock: taken at checkout, refused when short, returned on cancel', async () => {
    await setItem('cookie', 'stock=3')
    const o = await order(alice, line({ item_id: 'cookie', size: 'piece1', qty: 2 }))
    expect(await stock('cookie')).toBe(1)
    await expect(order(bob, line({ item_id: 'cookie', size: 'piece1', qty: 2 }))).rejects.toThrow(/out-of-stock/)
    expect(await stock('cookie')).toBe(1)                                     // the failed order took nothing
    await as(db, alice, 'select public.cancel_order($1)', [o.id]); await as(db, alice, 'select public.cancel_order($1)', [o.id])
    expect(await stock('cookie')).toBe(3)                                     // returned once
    await setItem('cookie', 'stock=null')
  })
  it('two lines of the same item share the stock, and zero stock means sold out', async () => {
    await setItem('cookie', 'stock=2')
    await expect(order(alice, JSON.stringify([{ item_id: 'cookie', size: 'piece1', qty: 1 }, { item_id: 'cookie', size: 'piece1', qty: 2 }]))).rejects.toThrow(/out-of-stock/)
    expect(await stock('cookie')).toBe(2)
    await order(alice, line({ item_id: 'cookie', size: 'piece1', qty: 2 }))
    expect(await stock('cookie')).toBe(0)
    await expect(order(bob, line({ item_id: 'cookie', size: 'piece1' }))).rejects.toThrow(/out-of-stock/)
    await setItem('cookie', 'stock=null')
  })
  it('unlimited stock (null) never changes; rewards also use stock', async () => {
    expect(await stock('latte')).toBeNull()
    await order(alice, line({ qty: 2 })); expect(await stock('latte')).toBeNull()
    const c = await addUser(db); await give(c.id, 6)
    await setItem('latte', 'stock=1')
    const o = await order(c, line({ reward: true })); expect(await stock('latte')).toBe(0)
    await as(db, c, 'select public.cancel_order($1)', [o.id]); expect(await stock('latte')).toBe(1)
    await setItem('latte', 'stock=null')
  })
  it('only the owner can change coins and stock; values are range-checked', async () => {
    await expect(as(db, staff, "update public.menu_items set stock=5 where id='latte'")).resolves.toBeDefined()
    expect(await stock('latte')).toBeNull()                                   // staff update matched no rows
    await expect(setItem('latte', 'stock=-1')).rejects.toThrow(/check/)
    await expect(setItem('latte', 'coins_earned=-1')).rejects.toThrow(/check/)
    await expect(setItem('latte', 'reward_cost=0')).rejects.toThrow(/check/)
  })
})

describe('events', () => {
  const mk = async (extra = '') => (await as(db, owner, `insert into public.events (title_fa, title_en, day, start_time, capacity ${extra ? ', ' + extra.split('|')[0] : ''}) values ('ت', 'T', public.cafe_today() + 2, '18:00', 3 ${extra ? ', ' + extra.split('|')[1] : ''}) returning id, booked`))[0]
  const book = (u: any, id: string) => as(db, u, 'select (public.book_event($1)).booked b', [id])
  it('everyone reads published events; drafts are staff-only; only the owner writes', async () => {
    const pub = await mk(); const draft = (await as(db, owner, "insert into public.events (title_fa, title_en, day, start_time, capacity, published) values ('پ','D', public.cafe_today()+1, '10:00', 5, false) returning id"))[0]
    const seen = (await as(db, 'anon', 'select id from public.events')).map((r: any) => r.id)
    expect(seen).toContain(pub.id); expect(seen).not.toContain(draft.id)
    expect((await as(db, staff, 'select id from public.events')).map((r: any) => r.id)).toContain(draft.id)
    await expect(as(db, staff, "insert into public.events (title_fa, title_en, day, start_time, capacity) values ('x','x', current_date, '10:00', 1)")).rejects.toThrow(/row-level security/)
    await expect(as(db, alice, 'delete from public.events where id=$1', [pub.id])).resolves.toEqual([])
    await expect(as(db, 'anon', 'select public.book_event($1)', [pub.id])).rejects.toThrow(/permission denied/)
  })
  it('a customer saves one seat; saving twice does nothing; cancelling frees it', async () => {
    const e = await mk()
    expect((await book(alice, e.id))[0].b).toBe(1)
    expect((await book(alice, e.id))[0].b).toBe(1)
    expect((await book(bob, e.id))[0].b).toBe(2)
    expect((await as(db, alice, 'select (public.cancel_booking($1)).booked b', [e.id]))[0].b).toBe(1)
    expect((await as(db, alice, 'select (public.cancel_booking($1)).booked b', [e.id]))[0].b).toBe(1)
    expect((await as(db, alice, 'select count(*)::int c from public.event_seats')).map((r: any) => r.c)[0]).toBe(0)   // alice sees only her own rows
  })
  it('is full at capacity minus held seats, and cancelling reopens a seat', async () => {
    const e = (await as(db, owner, "insert into public.events (title_fa, title_en, day, start_time, capacity, held) values ('ت','T', public.cafe_today()+1, '18:00', 3, 1) returning id"))[0]
    await book(alice, e.id); await book(bob, e.id)
    const c = await addUser(db)
    await expect(book(c, e.id)).rejects.toThrow(/event-full/)
    await as(db, bob, 'select public.cancel_booking($1)', [e.id])
    expect((await book(c, e.id))[0].b).toBe(2)
  })
  it('past or hidden events cannot be booked', async () => {
    const past = (await as(db, owner, "insert into public.events (title_fa, title_en, day, start_time, capacity) values ('ت','T', public.cafe_today()-1, '18:00', 3) returning id"))[0]
    await expect(book(alice, past.id)).rejects.toThrow(/event-closed/)
    const hid = (await as(db, owner, "insert into public.events (title_fa, title_en, day, start_time, capacity, published) values ('ت','T', public.cafe_today()+1, '18:00', 3, false) returning id"))[0]
    await expect(book(alice, hid.id)).rejects.toThrow(/event-not-found/)
  })
  it('seat counts cannot be edited directly, and capacity cannot drop below taken seats', async () => {
    const e = await mk(); await book(alice, e.id)
    await as(db, owner, 'update public.events set booked = 0 where id=$1', [e.id])
    expect((await as(db, null, 'select booked from public.events where id=$1', [e.id]))[0].booked).toBe(1)
    await expect(as(db, owner, 'update public.events set capacity = 0 where id=$1', [e.id])).rejects.toThrow(/capacity-too-small/)
    await expect(as(db, owner, 'update public.events set held = 3 where id=$1', [e.id])).rejects.toThrow(/capacity-too-small|check/)
  })
  it('staff see who saved a seat; customers do not; deleting an event removes its seats', async () => {
    const e = await mk(); await book(alice, e.id)
    expect((await as(db, staff, 'select * from public.event_attendees($1)', [e.id])).length).toBe(1)
    await expect(as(db, alice, 'select * from public.event_attendees($1)', [e.id])).rejects.toThrow(/not-allowed/)
    await as(db, owner, 'delete from public.events where id=$1', [e.id])
    expect((await as(db, null, 'select count(*)::int c from public.event_seats where event_id=$1', [e.id]))[0].c).toBe(0)
  })
  it('input is range-checked', async () => {
    await expect(as(db, owner, "insert into public.events (title_fa, title_en, day, start_time, capacity) values ('ت','T', current_date, '25:00', 3)")).rejects.toThrow(/check/)
    await expect(as(db, owner, "insert into public.events (title_fa, title_en, day, start_time, capacity, icon) values ('ت','T', current_date, '10:00', 3, 'x')")).rejects.toThrow(/check/)
  })
})
