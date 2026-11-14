import type { Category, LedgerEntry, Lang, MenuItem, Offer, Order, PlaceOrderInput } from '../types'

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

export interface Settings {
  rewardEvery: number; deliveryFee: number; shopOpen: boolean; tableCount: number
  brand: Record<Lang, string>; accent?: string; gold?: string; heroUrl?: string
  /** Card-to-card deposit: 16 digits, shown to the customer after checkout. */
  paymentCard?: string; paymentHolder?: string; requireDeposit: boolean
}
export interface SettingsRepo extends Subscribable {
  get(): Promise<Settings>
}

export type OrderErrorCode =
  | 'shop-closed' | 'empty' | 'item-unavailable' | 'address-required' | 'not-enough-coins' | 'not-found'
  | 'table-required' | 'phone-required' | 'bad-option' | 'reward-not-allowed' | 'not-allowed' | 'not-authenticated'
  | 'deposit-required' | 'order-closed' | 'out-of-stock'
export class OrderError extends Error {
  constructor(public code: OrderErrorCode) { super(code) }
}

/** Dashboard-only operations. Staff can read orders; everything here needs the owner role (enforced by the database). */
export interface AdminItem extends MenuItem { name: Record<Lang, string>; desc: Record<Lang, string>; archived: boolean }
export interface NewItem { name: Record<Lang, string>; desc: Record<Lang, string>; cat: Category; price: number; milk: boolean; rewardEligible: boolean; coinsEarned?: number; rewardCost?: number; stock?: number | null }
export interface OfferDraft { title: Record<Lang, string>; body: Record<Lang, string>; itemId: string; pct: number; audience: string; endsAt?: string }
export interface Customer { id: string; name: string; phone?: string; balance: number; orders: number }
export interface LedgerRow extends LedgerEntry { customer: string }
export interface AdminRepo extends Subscribable {
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

export interface Repos { menu: MenuRepo; orders: OrderRepo; coins: CoinRepo; offers: OfferRepo; settings: SettingsRepo; admin: AdminRepo }
