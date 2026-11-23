export type Lang = 'fa' | 'en'
export type Category = 'hot' | 'cold' | 'tea' | 'breakfast' | 'food' | 'sweet' | 'goods'
export type OrderMode = 'pickup' | 'table' | 'delivery'
export type OrderStatus = 'new' | 'prep' | 'ready' | 'out' | 'done' | 'cancelled'

export interface SizeOption { key: string; mult: number; scale: number }

export interface MenuItem {
  id: string
  cat: Category
  /** Base price in Toman for the first size. */
  price: number
  /** Id of the flat illustration (see art/art.ts). */
  art: string
  milk: boolean
  syrupOptions: boolean
  available: boolean
  rewardEligible: boolean
  /** Coins earned for each unit ordered (default 1), paid when the order is done. */
  coinsEarned: number
  /** Coins needed to take this item as a free reward. */
  rewardCost: number
  /** Units left; null = unlimited. 0 means sold out. */
  stock: number | null
  sizes: SizeOption[]
  /** Copy keys (without the "tag." prefix) shown as tags. */
  tags: string[]
  /** Names and text set in the dashboard. When absent, the built-in copy for this id is used. */
  name?: Record<Lang, string>
  desc?: Record<Lang, string>
  /** Public URL of the uploaded picture. */
  image?: string
  archived?: boolean
}

export interface Offer {
  id: number
  title: Record<Lang, string>
  body: Record<Lang, string>
  itemId: string
  pct: number
  audience: string
  active: boolean
  read: boolean
}

export interface Syrup {
  id: string
  name: Record<Lang, string>
  pricePerPump: number
  active: boolean
}

export interface CartLine {
  itemId: string
  size: string
  milk: number
  syrupId: string | null
  syrupPumps: number
  qty: number
  mugQty?: number
  /** A reward line costs N coins at checkout and is free. */
  free: boolean
}

export interface OrderItemSummary { itemId: string; qty: number; free: boolean; milk?: number; syrupId?: string; syrupPumps?: number; mugQty?: number; /** coins earned per unit, fixed when the order was placed */ coin?: number }

export interface Order {
  n: number
  mode: OrderMode
  table?: string
  address?: string
  items: OrderItemSummary[]
  subtotal: number
  fee: number
  total: number
  status: OrderStatus
  /** The cafe has confirmed the deposit (or there was nothing to pay). Preparation starts only after this. */
  paid: boolean
  archived?: boolean
  mine: boolean
  who: string
  at: string
}

export interface LedgerEntry { id: number; at: string; delta: number; reason: string; orderN?: number }

export interface PlaceOrderInput { lines: CartLine[]; mode: OrderMode; table?: string; address?: string; /** Required for guests (no account); the cafe calls it if something is wrong. */ phone?: string }

export type EventIcon = 'music' | 'book' | 'cake' | 'bean' | 'cup' | 'lantern' | 'brush' | 'jar' | 'heart'
export const EVENT_ICONS: EventIcon[] = ['music', 'book', 'cake', 'bean', 'cup', 'lantern', 'brush', 'jar', 'heart']
/** A little gathering at the cafe. `day` is YYYY-MM-DD and `time` is HH:MM, both at the cafe. */
export interface CafeEvent {
  id: string; icon: EventIcon
  title: Record<Lang, string>; desc: Record<Lang, string>; place: Record<Lang, string>
  day: string; time: string; hours: number
  capacity: number
  /** Seats the cafe keeps for itself. */ held: number
  /** Seats saved by customers (includes the signed-in customer's own). */ booked: number
  published: boolean
}
export type EventInput = Omit<CafeEvent, 'id' | 'booked'>
