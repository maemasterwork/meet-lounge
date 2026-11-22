import type { SupabaseClient } from '@supabase/supabase-js'
import type { CafeEvent, EventInput, LedgerEntry, MenuItem, Offer, Order, OrderMode, OrderStatus, PlaceOrderInput, Syrup } from '../types'
import { isDrinkCategory, normalizeSizes } from '../data/catalog'
import { OrderError, SCENE_EVENTS, SEASONS, type AdminItem, type Customer, type LedgerRow, type OrderErrorCode, type Repos, type Settings } from './types'

const CODES: OrderErrorCode[] = [
  'shop-closed', 'empty', 'item-unavailable', 'address-required', 'not-enough-coins', 'not-found',
  'table-required', 'phone-required', 'bad-option', 'reward-not-allowed', 'not-allowed', 'not-authenticated',
  'deposit-required', 'order-closed', 'out-of-stock', 'event-full', 'event-closed', 'event-not-found', 'capacity-too-small',
]
/** Postgres raises our error codes as the message; anything else is a network/unknown failure and is rethrown as is. */
function mapError(e: unknown): never {
  const msg = String((e as { message?: string })?.message ?? '')
  const code = CODES.find((c) => msg.includes(c))
  if (code) throw new OrderError(code)
  throw e instanceof Error ? e : new Error(msg || 'request failed')
}
const ok = <T>(r: { data: T | null; error: unknown }): T => { if (r.error) mapError(r.error); return r.data as T }

const READ_KEY = 'ml.offers.read'
const readIds = (): number[] => { try { return JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') } catch { return [] } }

/* eslint-disable @typescript-eslint/no-explicit-any */
const BUCKET = 'menu-images'
const toEvent = (r: any): CafeEvent => ({
  id: r.id, icon: r.icon, title: { fa: r.title_fa, en: r.title_en }, desc: { fa: r.description_fa, en: r.description_en }, place: { fa: r.place_fa, en: r.place_en },
  day: r.day, time: String(r.start_time).slice(0, 5), hours: r.hours, capacity: r.capacity, held: r.held, booked: r.booked, published: r.published,
})
const fromEvent = (e: EventInput) => ({
  icon: e.icon, title_fa: e.title.fa, title_en: e.title.en, description_fa: e.desc.fa, description_en: e.desc.en, place_fa: e.place.fa, place_en: e.place.en,
  day: e.day, start_time: e.time, hours: e.hours, capacity: e.capacity, held: e.held, published: e.published,
})
const toMenu = (r: any, pub: (path: string | null) => string | undefined): MenuItem => ({
  id: r.id, cat: r.category, price: r.base_price, art: r.art, milk: r.milk_options, syrupOptions: r.syrup_options, available: r.available,
  rewardEligible: r.reward_eligible, coinsEarned: r.coins_earned ?? 1, rewardCost: r.reward_cost ?? 6, stock: r.stock ?? null, sizes: normalizeSizes(r.sizes), tags: r.tags ?? [],
  name: { fa: r.name_fa, en: r.name_en }, desc: { fa: r.description_fa, en: r.description_en },
  image: pub(r.image_path), archived: r.archived,
})
const toSettings = (r: any, pub: (path: string | null) => string | undefined): Settings => ({
  rewardEvery: r.reward_every, deliveryFee: r.delivery_fee, shopOpen: r.shop_open, tableCount: r.table_count,
  paymentCard: r.payment_card ?? undefined, paymentHolder: r.payment_holder ?? undefined, requireDeposit: r.require_deposit ?? true, season: (SEASONS as string[]).includes(r.season) ? r.season : 'fall', sceneEvent: (SCENE_EVENTS as string[]).includes(r.scene_event) ? r.scene_event : 'none',
  brand: { fa: r.brand_name_fa, en: r.brand_name_en }, accent: r.theme?.accent, gold: r.theme?.gold, heroUrl: pub(r.hero_image_path),
})
const toOffer = (r: any, read: number[]): Offer => ({
  id: r.id, title: { fa: r.title_fa, en: r.title_en || r.title_fa }, body: { fa: r.body_fa, en: r.body_en || r.body_fa },
  itemId: r.item_id, pct: r.discount_pct, audience: r.audience, active: r.active, read: read.includes(r.id),
})
const toSyrup = (r: any): Syrup => ({ id: r.id, name: { fa: r.name_fa, en: r.name_en }, pricePerPump: r.price_per_pump, active: r.active })
const toOrder = (r: any, uid: string | null): Order => ({
  n: r.number, mode: r.mode as OrderMode, table: r.table_no ?? undefined, address: r.address ?? undefined,
  items: (r.order_items ?? []).map((i: any) => ({ itemId: i.item_id, qty: i.qty, free: i.is_reward, milk: i.milk, syrupId: i.syrup_id ?? undefined, syrupPumps: i.syrup_pumps ?? 0, coin: i.coin_each })),
  subtotal: r.subtotal, fee: r.delivery_fee, total: r.total, status: r.status as OrderStatus, paid: !!r.paid_at,
  archived: !!r.archived, mine: r.customer_id === uid, who: r.profiles?.display_name || r.guest_phone || r.profiles?.phone || String(r.customer_id).slice(0, 6), at: r.created_at,
})
const ORDER_SELECT = '*, order_items(item_id, qty, is_reward, coin_each, milk, syrup_id, syrup_pumps), profiles(display_name, phone)'

export function createSupabaseRepos(sb: SupabaseClient, getUserId: () => string | null): Repos {
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((f) => f())
  const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

  const pub = (path: string | null) => (path ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : undefined)
  const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
  const upload = async (folder: string, name: string, file: File) => {
    const ext = EXT[file.type]
    if (!ext) throw new Error('image-type')
    if (file.size > 2.5 * 1024 * 1024) throw new Error('image-too-big')
    const path = `${folder}/${name}-${Date.now()}.${ext}`          // new name each time, so browsers never show a stale cached picture
    const r = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' })
    if (r.error) mapError(r.error)
    return path
  }

  // One realtime channel; every change just tells screens to reload (RLS decides which rows each user receives).
  let channel: ReturnType<SupabaseClient['channel']> | null = null
  const ensureChannel = () => {
    if (channel) return
    channel = sb.channel('meet-lounge')
    for (const table of ['orders', 'coin_ledger', 'offers', 'menu_items', 'settings', 'events', 'syrups']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, emit)
    }
    channel.subscribe()
  }
  const sub = (cb: () => void) => { ensureChannel(); return subscribe(cb) }

  // Optimistic cache of the staff order list, so Advance/Cancel feel instant and roll back if the server says no.
  let allCache: Order[] | null = null
  const patchAll = (n: number, status: OrderStatus) => {
    if (!allCache) return null
    const prev = allCache
    allCache = allCache.map((o) => (o.n === n ? { ...o, status } : o))
    emit()
    return prev
  }
  const NEXT = (o: Order): OrderStatus => ({ new: 'prep', prep: 'ready', ready: o.mode === 'delivery' ? 'out' : 'done', out: 'done', done: 'done', cancelled: 'cancelled' } as const)[o.status]

  /** Asks the Edge Function to send web push. Best effort: a failure never blocks the dashboard. */
  const push = (body: { kind: 'offer'; offerId: number } | { kind: 'order'; orderId: string }) => { void sb.functions.invoke('send-push', { body }).catch(() => undefined) }

  const orderIdOf = async (n: number) => {
    const r = await sb.from('orders').select('id').eq('number', n).maybeSingle()
    if (r.error) mapError(r.error)
    if (!r.data) throw new OrderError('not-found')
    return r.data.id as string
  }

  const updateItem = async (id: string, p: Parameters<Repos['admin']['saveItem']>[1]) => {
    const u: Record<string, unknown> = {}
     if (p.cat !== undefined) u.category = p.cat
    if (p.price !== undefined) u.base_price = p.price
     if (p.art !== undefined) u.art = p.art
     if (p.milk !== undefined) u.milk_options = p.milk
     if (p.syrupOptions !== undefined) u.syrup_options = p.syrupOptions
    if (p.available !== undefined) u.available = p.available
    if (p.rewardEligible !== undefined) u.reward_eligible = p.rewardEligible
    if (p.coinsEarned !== undefined) u.coins_earned = p.coinsEarned
    if (p.rewardCost !== undefined) u.reward_cost = p.rewardCost
    if (p.stock !== undefined) u.stock = p.stock
    if (p.sizes !== undefined) u.sizes = p.sizes
    if (p.tags !== undefined) u.tags = p.tags
    if (p.archived !== undefined) u.archived = p.archived
    if (p.name) { u.name_fa = p.name.fa; u.name_en = p.name.en }
    if (p.desc) { u.description_fa = p.desc.fa; u.description_en = p.desc.en }
    const r = await sb.from('menu_items').update(u).eq('id', id).select('id')
    if (!r.error && !r.data?.length) throw new OrderError('not-allowed')
    ok(r)
  }

  return {
    menu: {
      subscribe: sub,
      async list() { return ok(await sb.from('menu_items').select('*').eq('archived', false).order('sort')).map((r: any) => toMenu(r, pub)) },
      async setPrice(id, price) { ok(await sb.from('menu_items').update({ base_price: price }).eq('id', id).select()); emit() },
      async setAvailable(id, available) { ok(await sb.from('menu_items').update({ available }).eq('id', id).select()); emit() },
    },
    orders: {
      subscribe: sub,
      async listMine() {
        const uid = getUserId()
        if (!uid) return []
        return ok(await sb.from('orders').select(ORDER_SELECT).eq('customer_id', uid).order('number', { ascending: false })).map((r) => toOrder(r, uid))
      },
      async listAll() {
        const uid = getUserId()
        const rows: any[] = []
        const pageSize = 500
        for (let offset = 0; ; offset += pageSize) {
          const page = ok(await sb.from('orders').select(ORDER_SELECT).order('number', { ascending: false }).range(offset, offset + pageSize - 1))
          rows.push(...page)
          if (page.length < pageSize) break
        }
        allCache = rows.map((r) => toOrder(r, uid))
        return allCache
      },
      async place(input: PlaceOrderInput) {
        const items = input.lines.map((l) => ({ item_id: l.itemId, size: l.size, milk: l.milk, syrup_id: l.syrupId, syrup_pumps: l.syrupPumps, qty: l.free ? 1 : l.qty, reward: l.free }))
        const r = await sb.rpc('create_order', { p_items: items, p_mode: input.mode, p_table: input.mode === 'table' ? input.table ?? null : null, p_address: input.mode === 'delivery' ? input.address ?? null : null, p_phone: input.phone ?? null })
        const row: any = ok(r)
        const full = ok(await sb.from('orders').select(ORDER_SELECT).eq('id', row.id).single())
        emit()
        return toOrder(full, getUserId())
      },
      async advance(n) {
        const cur = allCache?.find((o) => o.n === n)
        const prev = cur ? patchAll(n, NEXT(cur)) : null
        try {
          const row: any = ok(await sb.rpc('advance_order', { p_order_id: await orderIdOf(n) }))
          if (['ready', 'out', 'done'].includes(row.status)) push({ kind: 'order', orderId: row.id })
          const full = ok(await sb.from('orders').select(ORDER_SELECT).eq('id', row.id).single())
          emit()
          return toOrder(full, getUserId())
        } catch (e) { if (prev) { allCache = prev; emit() }; throw e }
      },
      async markPaid(n) {
        const row: any = ok(await sb.rpc('mark_paid', { p_order_id: await orderIdOf(n) }))
        const full = ok(await sb.from('orders').select(ORDER_SELECT).eq('id', row.id).single())
        emit()
        return toOrder(full, getUserId())
      },
      async cancel(n) {
        const prev = patchAll(n, 'cancelled')
        try {
          const row: any = ok(await sb.rpc('cancel_order', { p_order_id: await orderIdOf(n) }))
          const full = ok(await sb.from('orders').select(ORDER_SELECT).eq('id', row.id).single())
          emit()
          return toOrder(full, getUserId())
        } catch (e) { if (prev) { allCache = prev; emit() }; throw e }
      },
      async setArchived(n, archived) {
        const r = await sb.from('orders').update({ archived }).eq('number', n).select(ORDER_SELECT).maybeSingle()
        const row = ok(r)
        if (!row) throw new OrderError('not-allowed')
        const updated = toOrder(row, getUserId())
        if (allCache) allCache = allCache.map((o) => o.n === n ? updated : o)
        emit()
        return updated
      },
      async archiveAll() {
        const count = ok<number>(await sb.rpc('archive_all_orders'))
        if (!Number.isInteger(count) || count < 0) throw new Error('archive-count-invalid')
        if (allCache) allCache = allCache.map((o) => o.archived ? o : { ...o, archived: true })
        emit()
        return count
      },
      async confirmDelivery(n) {
        const row: any = ok(await sb.rpc('confirm_delivery', { p_order_number: n }))
        const full = ok(await sb.from('orders').select(ORDER_SELECT).eq('id', row.id).single())
        const updated = toOrder(full, getUserId())
        if (allCache) allCache = allCache.map((o) => o.n === n ? updated : o)
        emit()
        return updated
      },
    },
    coins: {
      subscribe: sub,
      async balance() { const uid = getUserId(); if (!uid) return 0; return Number(ok(await sb.rpc('my_balance')) ?? 0) },
      async ledger() {
        const uid = getUserId()
        if (!uid) return []
        const rows = ok(await sb.from('coin_ledger').select('id, created_at, delta, reason, orders(number)').eq('customer_id', uid).order('id', { ascending: false }))
        return rows.map((r: any): LedgerEntry => ({ id: r.id, at: r.created_at, delta: r.delta, reason: r.reason, orderN: r.orders?.number ?? undefined }))
      },
    },
    offers: {
      subscribe: sub,
      async listActive() { const read = readIds(); return ok(await sb.from('offers').select('*').order('id', { ascending: false })).map((r: any) => toOffer(r, read)) },
      async markAllRead() {
        const rows = ok(await sb.from('offers').select('id'))
        try { localStorage.setItem(READ_KEY, JSON.stringify(rows.map((r: any) => r.id))) } catch { /* private mode: badge simply returns */ }
        emit()
      },
    },
    syrups: {
      subscribe: sub,
      async list() { return ok(await sb.from('syrups').select('*').order('sort')).map(toSyrup) },
    },
    events: {
      subscribe: sub,
      async list() { return ok(await sb.from('events').select('*').eq('published', true).order('day').order('start_time')).map(toEvent) },
      async mine() { const uid = getUserId(); if (!uid) return []; return ok(await sb.from('event_seats').select('event_id').eq('customer_id', uid)).map((r: any) => r.event_id as string) },
      async book(id) { const e = toEvent(ok(await sb.rpc('book_event', { p_event: id }))); emit(); return e },
      async cancel(id) { const e = toEvent(ok(await sb.rpc('cancel_booking', { p_event: id }))); emit(); return e },
    },
    settings: {
      subscribe: sub,
      async get(): Promise<Settings> {
        return toSettings(ok(await sb.from('settings').select('*').eq('id', 1).single()), pub)
      },
    },
    admin: {
      subscribe: sub,
      async events() { return ok(await sb.from('events').select('*').order('day').order('start_time')).map(toEvent) },
      async saveEvent(id, input) {
        if (id) {
          const r = await sb.from('events').update(fromEvent(input)).eq('id', id).select('id')
          if (!r.error && !r.data?.length) throw new OrderError('not-allowed')
          ok(r); emit(); return id
        }
        const row: any = ok(await sb.from('events').insert(fromEvent(input)).select('id').single())
        emit(); return row.id as string
      },
      async deleteEvent(id) {
        const r = await sb.from('events').delete().eq('id', id).select('id')
        if (!r.error && !r.data?.length) throw new OrderError('not-allowed')
        ok(r); emit()
      },
      async attendees(id) { return ok(await sb.rpc('event_attendees', { p_event: id })).map((r: any) => ({ name: r.name ?? '', phone: r.phone ?? undefined, at: r.at })) },
      async items() { return ok(await sb.from('menu_items').select('*').order('sort')).map((r: any): AdminItem => ({ ...toMenu(r, pub), name: { fa: r.name_fa, en: r.name_en }, desc: { fa: r.description_fa, en: r.description_en }, archived: r.archived })) },
      async saveItem(id, p) {
        await updateItem(id, p)
        emit()
      },
      async saveItems(changes) {
        await Promise.all(changes.map(({ id, patch }) => updateItem(id, patch)))
        emit()
      },
      async reorderItems(ids) {
        for (const [sort, id] of ids.entries()) {
          const r = await sb.from('menu_items').update({ sort }).eq('id', id).select('id')
          if (!r.error && !r.data?.length) throw new OrderError('not-allowed')
          ok(r)
        }
        emit()
      },
      async addItem(i) {
        const base = (i.name.en || i.name.fa).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)
        const id = `${base.length >= 2 ? base : i.cat}-${Math.random().toString(36).slice(2, 6)}`
        const sizes = isDrinkCategory(i.cat) ? [{ key: 'small', mult: 1, scale: 0.9 }, { key: 'medium', mult: 1.15, scale: 1 }, { key: 'large', mult: 1.3, scale: 1.08 }] : [{ key: 'piece1', mult: 1, scale: 1 }]
        const art = i.cat === 'goods' ? 'mug' : i.cat === 'sweet' || i.cat === 'breakfast' || i.cat === 'food' ? 'cookie' : i.cat === 'cold' ? 'iceamer' : 'espresso'
        const sort = Number((await sb.from('menu_items').select('sort').order('sort', { ascending: false }).limit(1)).data?.[0]?.sort ?? 0) + 1
        ok(await sb.from('menu_items').insert({ id, category: i.cat, name_fa: i.name.fa, name_en: i.name.en, description_fa: i.desc.fa, description_en: i.desc.en, base_price: i.price, sizes: i.sizes ?? sizes, milk_options: i.milk, syrup_options: i.syrupOptions && isDrinkCategory(i.cat), reward_eligible: i.rewardEligible, coins_earned: i.coinsEarned ?? 1, reward_cost: i.rewardCost ?? 6, stock: i.stock ?? null, tags: i.tags ?? [], art: i.art || art, sort }).select('id'))
        emit(); return id
      },
      async setItemImage(id, file) {
        const path = file ? await upload('items', id, file) : null
        ok(await sb.from('menu_items').update({ image_path: path }).eq('id', id).select('id')); emit()
      },
      async saveSyrups(changes) {
        await Promise.all(changes.map(async ({ id, patch }) => {
          const u: Record<string, unknown> = {}
          if (patch.name) { u.name_fa = patch.name.fa; u.name_en = patch.name.en }
          if (patch.pricePerPump !== undefined) u.price_per_pump = patch.pricePerPump
          if (patch.active !== undefined) u.active = patch.active
          const r = await sb.from('syrups').update(u).eq('id', id).select('id')
          if (!r.error && !r.data?.length) throw new OrderError('not-allowed')
          ok(r)
        }))
        emit()
      },
      async addSyrup(syrup) {
        const sort = Number((await sb.from('syrups').select('sort').order('sort', { ascending: false }).limit(1)).data?.[0]?.sort ?? 0) + 1
        ok(await sb.from('syrups').insert({ id: syrup.id, name_fa: syrup.name.fa, name_en: syrup.name.en, price_per_pump: syrup.pricePerPump, active: syrup.active, sort }).select('id'))
        emit()
      },
      async deleteSyrup(id) {
        const r = await sb.from('syrups').delete().eq('id', id).select('id')
        if (!r.error && !r.data?.length) throw new OrderError('not-allowed')
        ok(r); emit()
      },
      async offers() { const read = readIds(); return ok(await sb.from('offers').select('*').order('id', { ascending: false })).map((r: any) => toOffer(r, read)) },
      async addOffer(o) {
        ok(await sb.from('offers').insert({ title_fa: o.title.fa, title_en: o.title.en, body_fa: o.body.fa, body_en: o.body.en, item_id: o.itemId, discount_pct: o.pct, audience: o.audience, ends_at: o.endsAt ?? null, active: true }).select('id')).forEach((r: any) => push({ kind: 'offer', offerId: r.id })); emit()
      },
      async setOfferActive(id, active) { ok(await sb.from('offers').update({ active }).eq('id', id).select('id')); emit() },
      async deleteOffer(id) { ok(await sb.from('offers').delete().eq('id', id).select('id')); emit() },
      async saveSettings(p) {
        const u: Record<string, unknown> = {}
        if (p.rewardEvery !== undefined) u.reward_every = p.rewardEvery
        if (p.deliveryFee !== undefined) u.delivery_fee = p.deliveryFee
        if (p.shopOpen !== undefined) u.shop_open = p.shopOpen
        if (p.tableCount !== undefined) u.table_count = p.tableCount
        if ('paymentCard' in p) u.payment_card = p.paymentCard || null
        if ('paymentHolder' in p) u.payment_holder = p.paymentHolder || null
        if (p.requireDeposit !== undefined) u.require_deposit = p.requireDeposit
        if (p.season !== undefined) u.season = p.season
        if (p.sceneEvent !== undefined) u.scene_event = p.sceneEvent
        if (p.brand) { u.brand_name_fa = p.brand.fa; u.brand_name_en = p.brand.en }
        if ('accent' in p || 'gold' in p) {
          const cur: any = ok(await sb.from('settings').select('theme').eq('id', 1).single())
          u.theme = { ...(cur?.theme ?? {}), ...('accent' in p ? { accent: p.accent ?? null } : {}), ...('gold' in p ? { gold: p.gold ?? null } : {}) }
        }
        const r = await sb.from('settings').update(u).eq('id', 1).select('id')
        if (!r.error && !r.data?.length) throw new OrderError('not-allowed')
        ok(r); emit()
      },
      async setHero(file) {
        const path = file ? await upload('hero', 'hero', file) : null
        ok(await sb.from('settings').update({ hero_image_path: path }).eq('id', 1).select('id')); emit()
      },
      async customers() { return ok(await sb.rpc('owner_customers')).map((r: any): Customer => ({ id: r.id, name: r.name ?? '', email: r.email, phone: r.phone ?? undefined, balance: r.balance, orders: r.orders })) },
      async adjustCoins(customerId, delta, note) { const b = ok(await sb.rpc('adjust_coins', { p_customer: customerId, p_delta: delta, p_note: note })); emit(); return Number(b) },
      async ledgerAll() {
        const rows = ok(await sb.from('coin_ledger').select('id, created_at, delta, reason, orders(number), profiles(display_name, phone)').order('id', { ascending: false }).limit(200))
        return rows.map((r: any): LedgerRow => ({ id: r.id, at: r.created_at, delta: r.delta, reason: r.reason, orderN: r.orders?.number ?? undefined, customer: r.profiles?.display_name || r.profiles?.phone || '' }))
      },
    },
  }
}
