export type Lang = 'fa' | 'en'
export type Category = 'hot' | 'cold' | 'sweet' | 'goods'
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
  available: boolean
  rewardEligible: boolean
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

export interface CartLine {
  itemId: string
  size: string
  milk: number
  sugar: number
  qty: number
  /** A reward line costs N coins at checkout and is free. */
  free: boolean
}

export interface OrderItemSummary { itemId: string; qty: number; free: boolean }

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
  mine: boolean
  who: string
  at: string
}

export interface LedgerEntry { id: number; at: string; delta: number; reason: string; orderN?: number }

export interface PlaceOrderInput { lines: CartLine[]; mode: OrderMode; table?: string; address?: string; /** Required for guests (no account); the cafe calls it if something is wrong. */ phone?: string }
