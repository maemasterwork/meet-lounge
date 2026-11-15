import type { CafeEvent, Category, EventInput, LedgerEntry, Lang, MenuItem, Offer, Order, PlaceOrderInput } from '../types'

/** Phase 3 replaces the mock implementations with Supabase ones. Pages call only these interfaces. */
export interface Subscribable { subscribe(cb: () => void): () => void }

export interface MenuRepo extends Subscribable {
  list(): Promise<MenuItem[]>
  setPrice(id: string, price: number): Promise<void>
  setAvailable(id: string, available: boolean): Promise<void>
}

export interface OrderRepo extends Subscribable {
  /** The signed-in customer's own orders, newest first. */
  listMine(): Promise<Order[]>
  /** All orders (staff and owner only). */
  listAll(): Promise<Order[]>
  /** Validates, prices on the "server" side and stores the order. Throws OrderError. */
  place(input: PlaceOrderInput): Promise<Order>
  /** Moves an order to its next status; completing a customer's order awards the coin. */
  advance(n: number): Promise<Order>
  /** Staff: the deposit arrived. Preparation can start after this. */
  markPaid(n: number): Promise<Order>
  cancel(n: number): Promise<Order>
}

export interface CoinRepo extends Subscribable {
  balance(): Promise<number>
  ledger(): Promise<LedgerEntry[]>
}

export interface OfferRepo extends Subscribable {
  listActive(): Promise<Offer[]>
  markAllRead(): Promise<void>
}

export type Season = 'spring' | 'summer' | 'fall' | 'winter'
export type SceneEvent = 'none' | 'yalda' | 'xmas' | 'nowruz' | 'anniv' | 'vday' | 'oil'
export const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter']
export const SCENE_EVENTS: SceneEvent[] = ['none', 'yalda', 'xmas', 'nowruz', 'anniv', 'vday', 'oil']
/** Picking a special event also sets the matching season (Nowruz and Oil Day = spring, Yalda and Christmas = winter). */
export const EVENT_SEASON: Partial<Record<SceneEvent, Season>> = { nowruz: 'spring', oil: 'spring', yalda: 'winter', xmas: 'winter' }
export interface Settings {
  rewardEvery: number; deliveryFee: number; shopOpen: boolean; tableCount: number
  brand: Record<Lang, string>; accent?: string; gold?: string; heroUrl?: string
  /** Card-to-card deposit: 16 digits, shown to the customer after checkout. */
  paymentCard?: string; paymentHolder?: string; requireDeposit: boolean
  /** Look of the 3D cafe behind the app; the owner picks it and every customer sees it. */
  season: Season
  /** Special decorations in the 3D cafe (not the cafe's calendar events). */
  sceneEvent: SceneEvent
}
export interface SettingsRepo extends Subscribable {
  get(): Promise<Settings>
}

export type OrderErrorCode =
  | 'shop-closed' | 'empty' | 'item-unavailable' | 'address-required' | 'not-enough-coins' | 'not-found'
  | 'table-required' | 'phone-required' | 'bad-option' | 'reward-not-allowed' | 'not-allowed' | 'not-authenticated'
  | 'deposit-required' | 'order-closed' | 'out-of-stock' | 'event-full' | 'event-closed' | 'event-not-found' | 'capacity-too-small'
export class OrderError extends Error {
  constructor(public code: OrderErrorCode) { super(code) }
}

/** Dashboard-only operations. Staff can read orders; everything here needs the owner role (enforced by the database). */
export interface AdminItem extends MenuItem { name: Record<Lang, string>; desc: Record<Lang, string>; archived: boolean }
export interface NewItem { name: Record<Lang, string>; desc: Record<Lang, string>; cat: Category; price: number; milk: boolean; rewardEligible: boolean; coinsEarned?: number; rewardCost?: number; stock?: number | null }
export interface OfferDraft { title: Record<Lang, string>; body: Record<Lang, string>; itemId: string; pct: number; audience: string; endsAt?: string }
export interface Customer { id: string; name: string; phone?: string; balance: number; orders: number }
export interface LedgerRow extends LedgerEntry { customer: string }
export interface EventsRepo extends Subscribable {
  /** Published events, soonest first. */
  list(): Promise<CafeEvent[]>
  /** Ids of the events the signed-in customer has saved a seat for. */
  mine(): Promise<string[]>
  /** Saves a seat (safe to repeat). Throws OrderError event-full / event-closed. */
  book(id: string): Promise<CafeEvent>
  cancel(id: string): Promise<CafeEvent>
}
export interface Attendee { name: string; phone?: string; at: string }

export interface AdminRepo extends Subscribable {
  /** All events, drafts included. */
  events(): Promise<CafeEvent[]>
  saveEvent(id: string | null, input: EventInput): Promise<string>
  deleteEvent(id: string): Promise<void>
  attendees(id: string): Promise<Attendee[]>
  items(): Promise<AdminItem[]>
  saveItem(id: string, patch: Partial<Pick<AdminItem, 'price' | 'available' | 'rewardEligible' | 'coinsEarned' | 'rewardCost' | 'stock' | 'archived' | 'name' | 'desc'>>): Promise<void>
  addItem(i: NewItem): Promise<string>
  setItemImage(id: string, file: File | null): Promise<void>
  offers(): Promise<Offer[]>
  addOffer(o: OfferDraft): Promise<void>
  setOfferActive(id: number, active: boolean): Promise<void>
  deleteOffer(id: number): Promise<void>
  saveSettings(p: Partial<Settings>): Promise<void>
  setHero(file: File | null): Promise<void>
  customers(): Promise<Customer[]>
  adjustCoins(customerId: string, delta: number, note: string): Promise<number>
  ledgerAll(): Promise<LedgerRow[]>
}

export interface Repos { menu: MenuRepo; orders: OrderRepo; coins: CoinRepo; offers: OfferRepo; settings: SettingsRepo; events: EventsRepo; admin: AdminRepo }
