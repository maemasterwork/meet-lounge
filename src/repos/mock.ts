import type { LedgerEntry, MenuItem, Offer, Order, OrderStatus, PlaceOrderInput } from '../types'
import { DEFAULT_REWARD_EVERY, DELIVERY_FEE, DRINK_SIZES, initialMenu } from '../data/catalog'
import { awardForOrder, balanceOf, cancelOrder, spendRewards } from '../lib/coins'
import { orderTotals } from '../lib/pricing'
import { OrderError, type AdminItem, type Customer, type LedgerRow, type Repos, type Settings } from './types'
import fa from '../i18n/fa.json'
import en from '../i18n/en.json'

const copy = (id: string, k: 'name' | 'desc') => ({ fa: (fa as Record<string, string>)[`item.${id}.${k}`] ?? id, en: (en as Record<string, string>)[`item.${id}.${k}`] ?? id })

const STEPS: Record<Order['mode'], OrderStatus[]> = {
  pickup: ['new', 'prep', 'ready', 'done'],
  table: ['new', 'prep', 'ready', 'done'],
  delivery: ['new', 'prep', 'ready', 'out', 'done'],
}
const clock = () => new Date().toISOString()

export function createMockRepos(): Repos {
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((f) => f())
  const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

  let menu: MenuItem[] = initialMenu()
  let settings: Settings = { rewardEvery: DEFAULT_REWARD_EVERY, deliveryFee: DELIVERY_FEE, shopOpen: true, tableCount: 12, brand: { fa: 'میت لانج', en: 'Meet Lounge' } }
  let offers: Offer[] = [
    { id: 1, title: { fa: 'لاته صبحگاهی', en: 'Morning latte' }, body: { fa: 'یک لاته با ۱۵٪ تخفیف، همین حالا.', en: 'A latte at 15% off, right now.' }, itemId: 'latte', pct: 15, audience: 'all', active: true, read: false },
  ]
  let nextOrder = 104
  let orders: Order[] = [
    { n: 101, mode: 'table', table: '4', items: [{ itemId: 'latte', qty: 2, free: false }, { itemId: 'croissant', qty: 1, free: false }], subtotal: 380000, fee: 0, total: 380000, status: 'prep', mine: false, who: 'Sara', at: clock() },
    { n: 102, mode: 'pickup', items: [{ itemId: 'coldbrew', qty: 1, free: false }], subtotal: 160000, fee: 0, total: 160000, status: 'new', mine: false, who: 'Maryam', at: clock() },
    { n: 103, mode: 'delivery', address: 'Valiasr St.', items: [{ itemId: 'cappuccino', qty: 2, free: false }, { itemId: 'brownie', qty: 1, free: false }], subtotal: 370000, fee: DELIVERY_FEE, total: 400000, status: 'out', mine: false, who: 'Ali', at: clock() },
    { n: 100, mode: 'pickup', items: [{ itemId: 'icedlatte', qty: 1, free: false }], subtotal: 145000, fee: 0, total: 145000, status: 'done', mine: true, who: 'me', at: clock() },
  ]
  // Customer starts with 5 coins: three from a welcome gift and two from earlier orders.
  let ledger: LedgerEntry[] = [
    { id: 3, at: clock(), delta: 1, reason: 'earn', orderN: 99 },
    { id: 2, at: clock(), delta: 1, reason: 'earn', orderN: 98 },
    { id: 1, at: clock(), delta: 3, reason: 'welcome' },
  ]

  const get = (n: number) => { const o = orders.find((x) => x.n === n); if (!o) throw new OrderError('not-found'); return o }
  const replace = (o: Order) => { orders = orders.map((x) => (x.n === o.n ? o : x)) }

  return {
    menu: {
      subscribe,
      list: async () => menu.filter((m) => !m.archived).map((m) => ({ ...m })),
      setPrice: async (id, price) => { menu = menu.map((m) => (m.id === id ? { ...m, price } : m)); emit() },
      setAvailable: async (id, available) => { menu = menu.map((m) => (m.id === id ? { ...m, available } : m)); emit() },
    },
    orders: {
      subscribe,
      listMine: async () => orders.filter((o) => o.mine),
      listAll: async () => orders.slice(),
      place: async (input: PlaceOrderInput) => {
        if (!settings.shopOpen) throw new OrderError('shop-closed')
        if (!input.lines.length) throw new OrderError('empty')
        if (input.mode === 'delivery' && !input.address?.trim()) throw new OrderError('address-required')
        for (const l of input.lines) if (!menu.find((m) => m.id === l.itemId)?.available) throw new OrderError('item-unavailable')
        const n = nextOrder++
        const rewardCount = input.lines.filter((l) => l.free).length
        try { ledger = spendRewards(ledger, settings.rewardEvery, rewardCount, n, clock()) } catch { throw new OrderError('not-enough-coins') }
        const totals = orderTotals(input.lines, menu, offers, input.mode, settings.deliveryFee)
        const order: Order = {
          n, mode: input.mode, table: input.mode === 'table' ? input.table : undefined, address: input.mode === 'delivery' ? input.address?.trim() : undefined,
          items: input.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, free: l.free })), ...totals, status: 'new', mine: true, who: 'me', at: clock(),
        }
        orders = [order, ...orders]
        emit()
        return order
      },
      advance: async (n) => {
        const o = get(n)
        const st = STEPS[o.mode]
        const next = st[st.indexOf(o.status) + 1]
        if (!next) return o
        const updated = { ...o, status: next }
        replace(updated)
        if (next === 'done' && o.mine) ledger = awardForOrder(ledger, n, clock())
        emit()
        return updated
      },
      cancel: async (n) => {
        const o = get(n)
        if (o.status === 'done' || o.status === 'cancelled') return o
        const updated = { ...o, status: 'cancelled' as const }
        replace(updated)
        if (o.mine) ledger = cancelOrder(ledger, n, clock())
        emit()
        return updated
      },
    },
    coins: { subscribe, balance: async () => balanceOf(ledger), ledger: async () => ledger.slice() },
    offers: {
      subscribe,
      listActive: async () => offers.filter((o) => o.active),
      markAllRead: async () => { offers = offers.map((o) => ({ ...o, read: true })); emit() },
    },
    settings: { subscribe, get: async () => ({ ...settings }) },
    admin: {
      subscribe,
      items: async () => menu.map((m): AdminItem => ({ ...m, name: m.name ?? copy(m.id, 'name'), desc: m.desc ?? copy(m.id, 'desc'), archived: !!m.archived })),
      saveItem: async (id, patch) => { menu = menu.map((m) => (m.id === id ? { ...m, ...patch } : m)); emit() },
      addItem: async (i) => {
        const id = `x-${Date.now().toString(36)}`
        menu = [...menu, { id, cat: i.cat, price: i.price, art: i.cat === 'goods' ? 'mug' : i.cat === 'sweet' ? 'cookie' : i.cat === 'cold' ? 'iceamer' : 'espresso', milk: i.milk, available: true, rewardEligible: i.rewardEligible,
          sizes: i.cat === 'hot' || i.cat === 'cold' ? DRINK_SIZES : [{ key: 'piece1', mult: 1, scale: 1 }], tags: [], name: i.name, desc: i.desc }]
        emit()
        return id
      },
      setItemImage: async (id, file) => { menu = menu.map((m) => (m.id === id ? { ...m, image: file ? URL.createObjectURL(file) : undefined } : m)); emit() },
      offers: async () => offers.slice(),
      addOffer: async (o) => { offers = [{ id: Math.max(0, ...offers.map((x) => x.id)) + 1, title: { fa: o.title.fa, en: o.title.en || o.title.fa }, body: { fa: o.body.fa, en: o.body.en || o.body.fa }, itemId: o.itemId, pct: o.pct, audience: o.audience, active: true, read: false }, ...offers]; emit() },
      setOfferActive: async (id, active) => { offers = offers.map((o) => (o.id === id ? { ...o, active } : o)); emit() },
      deleteOffer: async (id) => { offers = offers.filter((o) => o.id !== id); emit() },
      saveSettings: async (p) => { settings = { ...settings, ...p }; emit() },
      setHero: async (file) => { settings = { ...settings, heroUrl: file ? URL.createObjectURL(file) : undefined }; emit() },
      customers: async (): Promise<Customer[]> => [
        { id: 'me', name: 'Me', balance: balanceOf(ledger), orders: orders.filter((o) => o.mine).length },
        { id: 'c2', name: 'Sara', phone: '09121110000', balance: 5, orders: 9 }, { id: 'c3', name: 'Ali', phone: '09351112233', balance: 2, orders: 4 },
      ],
      adjustCoins: async (_id, delta) => { ledger = [{ id: ledger.length + 1, at: clock(), delta, reason: 'adjust' }, ...ledger]; emit(); return balanceOf(ledger) },
      ledgerAll: async (): Promise<LedgerRow[]> => ledger.map((l) => ({ ...l, customer: 'Me' })),
    },
  }
}
