import type { CafeEvent, LedgerEntry, MenuItem, Offer, Order, OrderStatus, PlaceOrderInput } from '../types'
import { DEFAULT_REWARD_EVERY, DELIVERY_FEE, DRINK_SIZES, initialMenu } from '../data/catalog'
import { awardForOrder, balanceOf, cancelOrder, earnOfOrder, rewardCostOf, spendRewards } from '../lib/coins'
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

const byDate = (a: CafeEvent, b: CafeEvent) => (a.day + a.time).localeCompare(b.day + b.time)

export function createMockRepos(): Repos {
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((f) => f())
  const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

  let menu: MenuItem[] = initialMenu()
  const dayOffset = (k: number) => { const d = new Date(); d.setDate(d.getDate() + k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  let events: CafeEvent[] = [
    { id: 'e1', icon: 'cake', title: { en: 'Cake Decorating Night', fa: 'شب تزئین کیک' }, desc: { en: 'Pipe, layer and crown your own little cake. Aprons on, sprinkles out.', fa: 'کیک کوچک خودتان را کرم بزنید، لایه کنید و تاج‌گذاری کنید.' }, place: { en: 'Our pastry kitchen', fa: 'آشپزخانهٔ شیرینی‌پزی' }, day: dayOffset(3), time: '18:00', hours: 2, capacity: 10, held: 2, booked: 3, published: true },
    { id: 'e2', icon: 'music', title: { en: 'Acoustic Evening', fa: 'شب آکوستیک' }, desc: { en: 'Guitar, soft voices and warm cups. Request a song if you dare.', fa: 'گیتار، صداهای آرام و فنجان‌های گرم.' }, place: { en: 'By the window', fa: 'کنار پنجره' }, day: dayOffset(6), time: '19:00', hours: 2, capacity: 24, held: 4, booked: 9, published: true },
    { id: 'e3', icon: 'cup', title: { en: 'Latte Art for Beginners', fa: 'لاته‌آرت برای شروع‌کننده‌ها' }, desc: { en: 'Pour a heart and a leaf on the foam yourself. Spills are encouraged.', fa: 'قلب و برگ را با دست خودتان روی فوم بریزید.' }, place: { en: 'The coffee bar', fa: 'بار قهوه' }, day: dayOffset(10), time: '16:00', hours: 2, capacity: 8, held: 1, booked: 5, published: true },
    { id: 'e4', icon: 'book', title: { en: "Little Readers' Circle", fa: 'حلقهٔ کتاب‌خوان‌ها' }, desc: { en: 'Bring a page you love, read it aloud, and swap books over tea.', fa: 'صفحه‌ای را که دوست دارید بیاورید و بلند بخوانید.' }, place: { en: 'The reading nook', fa: 'گوشهٔ کتاب' }, day: dayOffset(14), time: '17:00', hours: 2, capacity: 14, held: 2, booked: 4, published: true },
    { id: 'e5', icon: 'lantern', title: { en: 'Lantern Walk & Cocoa', fa: 'پیاده‌روی فانوس و کاکائو' }, desc: { en: 'A slow walk round the block, then hot cocoa back at the corner.', fa: 'یک پیاده‌روی آرام دور محله و کاکائوی داغ.' }, place: { en: 'Meet at the door', fa: 'جلوی در' }, day: dayOffset(17), time: '18:30', hours: 1, capacity: 20, held: 0, booked: 0, published: false },
  ]
  const mySeats = new Set<string>()
  const stockTaken = new Map<number, Record<string, number>>()
  let settings: Settings = { rewardEvery: DEFAULT_REWARD_EVERY, deliveryFee: DELIVERY_FEE, shopOpen: true, tableCount: 12, brand: { fa: 'میت لانژ', en: 'Meet Lounge' }, paymentCard: '6037991234567890', paymentHolder: 'Meet Lounge', requireDeposit: true, season: 'fall', sceneEvent: 'none' }
  let offers: Offer[] = [
    { id: 1, title: { fa: 'لاته صبحگاهی', en: 'Morning latte' }, body: { fa: 'یک لاته با ۱۵٪ تخفیف، همین حالا.', en: 'A latte at 15% off, right now.' }, itemId: 'latte', pct: 15, audience: 'all', active: true, read: false },
  ]
  let nextOrder = 104
  let orders: Order[] = [
    { n: 101, mode: 'table', table: '4', items: [{ itemId: 'latte', qty: 2, free: false }, { itemId: 'croissant', qty: 1, free: false }], subtotal: 380000, fee: 0, total: 380000, status: 'prep', paid: true, mine: false, who: 'Sara', at: clock() },
    { n: 102, mode: 'pickup', items: [{ itemId: 'coldbrew', qty: 1, free: false }], subtotal: 160000, fee: 0, total: 160000, status: 'new', paid: false, mine: false, who: 'Maryam', at: clock() },
    { n: 103, mode: 'delivery', address: 'Valiasr St.', items: [{ itemId: 'cappuccino', qty: 2, free: false }, { itemId: 'brownie', qty: 1, free: false }], subtotal: 370000, fee: DELIVERY_FEE, total: 400000, status: 'out', paid: true, mine: false, who: 'Ali', at: clock() },
    { n: 100, mode: 'pickup', items: [{ itemId: 'icedlatte', qty: 1, free: false }], subtotal: 145000, fee: 0, total: 145000, status: 'done', paid: true, mine: true, who: 'me', at: clock() },
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
        const want = new Map<string, number>()
        for (const l of input.lines) {
          const m = menu.find((x) => x.id === l.itemId)
          if (!m || !m.available) throw new OrderError('item-unavailable')
          want.set(m.id, (want.get(m.id) ?? 0) + (l.free ? 1 : l.qty))
        }
        for (const [id, q] of want) { const st = menu.find((x) => x.id === id)!.stock; if (st !== null && st < q) throw new OrderError('out-of-stock') }
        const n = nextOrder++
        try { ledger = spendRewards(ledger, rewardCostOf(input.lines, menu), n, clock()) } catch { nextOrder--; throw new OrderError('not-enough-coins') }
        const taken: Record<string, number> = {}
        menu = menu.map((m) => { const q = want.get(m.id); if (q && m.stock !== null) { taken[m.id] = q; return { ...m, stock: m.stock - q } } return m })
        stockTaken.set(n, taken)
        const totals = orderTotals(input.lines, menu, offers, input.mode, settings.deliveryFee)
        const order: Order = {
          n, mode: input.mode, table: input.mode === 'table' ? input.table : undefined, address: input.mode === 'delivery' ? input.address?.trim() : undefined,
          items: input.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, free: l.free, coin: l.free ? 0 : menu.find((m) => m.id === l.itemId)?.coinsEarned ?? 0 })), ...totals, status: 'new', paid: totals.total === 0 || !settings.requireDeposit, mine: true, who: 'me', at: clock(),
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
        if (o.status === 'new' && !o.paid) throw new OrderError('deposit-required')
        const updated = { ...o, status: next }
        replace(updated)
        if (next === 'done' && o.mine) ledger = awardForOrder(ledger, n, clock(), earnOfOrder(o))
        emit()
        return updated
      },
      markPaid: async (n) => {
        const o = get(n)
        if (o.status === 'cancelled') throw new OrderError('order-closed')
        const updated = { ...o, paid: true }
        replace(updated); emit()
        return updated
      },
      cancel: async (n) => {
        const o = get(n)
        if (o.status === 'done' || o.status === 'cancelled') return o
        const updated = { ...o, status: 'cancelled' as const }
        replace(updated)
        if (o.mine) ledger = cancelOrder(ledger, n, clock())
        const back = stockTaken.get(n)
        if (back) { menu = menu.map((m) => (back[m.id] && m.stock !== null ? { ...m, stock: m.stock + back[m.id] } : m)); stockTaken.delete(n) }
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
    events: {
      subscribe,
      list: async () => events.filter((e) => e.published).sort(byDate).map((e) => ({ ...e })),
      mine: async () => [...mySeats],
      book: async (id) => {
        const e = events.find((x) => x.id === id && x.published)
        if (!e) throw new OrderError('event-not-found')
        if (e.day < dayOffset(0)) throw new OrderError('event-closed')
        if (mySeats.has(id)) return { ...e }
        if (e.held + e.booked >= e.capacity) throw new OrderError('event-full')
        mySeats.add(id); const u = { ...e, booked: e.booked + 1 }; events = events.map((x) => (x.id === id ? u : x)); emit(); return { ...u }
      },
      cancel: async (id) => {
        const e = events.find((x) => x.id === id)
        if (!e) throw new OrderError('event-not-found')
        if (!mySeats.delete(id)) return { ...e }
        const u = { ...e, booked: e.booked - 1 }; events = events.map((x) => (x.id === id ? u : x)); emit(); return { ...u }
      },
    },
    admin: {
      subscribe,
      items: async () => menu.map((m): AdminItem => ({ ...m, name: m.name ?? copy(m.id, 'name'), desc: m.desc ?? copy(m.id, 'desc'), archived: !!m.archived })),
      saveItem: async (id, patch) => { menu = menu.map((m) => (m.id === id ? { ...m, ...patch } : m)); emit() },
      addItem: async (i) => {
        const id = `x-${Date.now().toString(36)}`
        menu = [...menu, { id, cat: i.cat, price: i.price, art: i.cat === 'goods' ? 'mug' : i.cat === 'sweet' ? 'cookie' : i.cat === 'cold' ? 'iceamer' : 'espresso', milk: i.milk, available: true, rewardEligible: i.rewardEligible, coinsEarned: i.coinsEarned ?? 1, rewardCost: i.rewardCost ?? settings.rewardEvery, stock: i.stock ?? null,
          sizes: i.cat === 'hot' || i.cat === 'cold' ? DRINK_SIZES : [{ key: 'piece1', mult: 1, scale: 1 }], tags: [], name: i.name, desc: i.desc }]
        emit()
        return id
      },
      setItemImage: async (id, file) => { menu = menu.map((m) => (m.id === id ? { ...m, image: file ? URL.createObjectURL(file) : undefined } : m)); emit() },
      events: async () => events.slice().sort(byDate).map((e) => ({ ...e })),
      saveEvent: async (id, input) => {
        if (id) {
          const old = events.find((e) => e.id === id)
          if (!old) throw new OrderError('event-not-found')
          if (input.held + old.booked > input.capacity) throw new OrderError('capacity-too-small')
          events = events.map((e) => (e.id === id ? { ...e, ...input } : e)); emit(); return id
        }
        if (input.held > input.capacity) throw new OrderError('capacity-too-small')
        const nid = `e${Date.now().toString(36)}`; events = [...events, { ...input, id: nid, booked: 0 }]; emit(); return nid
      },
      deleteEvent: async (id) => { events = events.filter((e) => e.id !== id); mySeats.delete(id); emit() },
      attendees: async (id) => { const e = events.find((x) => x.id === id); return Array.from({ length: e?.booked ?? 0 }, (_, i) => ({ name: i === 0 && mySeats.has(id) ? 'Me' : `Guest ${i + 1}`, at: new Date().toISOString() })) },
      offers: async () => offers.slice(),
      addOffer: async (o) => { offers = [{ id: Math.max(0, ...offers.map((x) => x.id)) + 1, title: { fa: o.title.fa, en: o.title.en || o.title.fa }, body: { fa: o.body.fa, en: o.body.en || o.body.fa }, itemId: o.itemId, pct: o.pct, audience: o.audience, active: true, read: false }, ...offers]; emit() },
      setOfferActive: async (id, active) => { offers = offers.map((o) => (o.id === id ? { ...o, active } : o)); emit() },
      deleteOffer: async (id) => { offers = offers.filter((o) => o.id !== id); emit() },
      saveSettings: async (p) => { settings = { ...settings, ...p }; emit() },
      setHero: async (file) => { settings = { ...settings, heroUrl: file ? URL.createObjectURL(file) : undefined }; emit() },
      customers: async (): Promise<Customer[]> => [
        { id: 'me', name: 'Me', email: 'me@example.test', balance: balanceOf(ledger), orders: orders.filter((o) => o.mine).length },
        { id: 'c2', name: 'Sara', email: 'sara@example.test', phone: '09121110000', balance: 5, orders: 9 }, { id: 'c3', name: 'Ali', email: 'ali@example.test', phone: '09351112233', balance: 2, orders: 4 },
      ],
      adjustCoins: async (_id, delta) => { ledger = [{ id: ledger.length + 1, at: clock(), delta, reason: 'adjust' }, ...ledger]; emit(); return balanceOf(ledger) },
      ledgerAll: async (): Promise<LedgerRow[]> => ledger.map((l) => ({ ...l, customer: 'Me' })),
    },
  }
}
