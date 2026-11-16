import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartLine, OrderMode } from '../types'

export const sameLine = (a: CartLine, b: CartLine) =>
  !a.free && !b.free && a.itemId === b.itemId && a.size === b.size && a.milk === b.milk && a.syrupId === b.syrupId && a.syrupPumps === b.syrupPumps

export function migrateCart(persisted: unknown, version: number): CartState {
  type StoredLine = Omit<CartLine, 'syrupId' | 'syrupPumps'> & { syrupId?: string | null; syrupPumps?: number; sugar?: number }
  const state = persisted as Omit<CartState, 'lines'> & { lines: StoredLine[] }
  return {
    ...state,
    lines: state.lines.map((stored) => {
      const { sugar: _sugar, ...line } = stored
      return { ...line, syrupId: version < 2 ? null : line.syrupId ?? null, syrupPumps: version < 2 ? 0 : line.syrupPumps ?? 0 }
    }),
  }
}

interface CartState {
  lines: CartLine[]
  mode: OrderMode
  table: string
  address: string
  add: (line: CartLine) => void
  addReward: (itemId: string, size: string) => void
  setQty: (index: number, qty: number) => void
  remove: (index: number) => void
  clear: () => void
  setMode: (m: OrderMode) => void
  setTable: (t: string) => void
  setAddress: (a: string) => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      mode: 'pickup',
      table: '4',
      address: '',
      add: (line) =>
        set((s) => {
          const i = s.lines.findIndex((l) => sameLine(l, line))
          if (i < 0) return { lines: [...s.lines, line] }
          const lines = s.lines.slice()
          lines[i] = { ...lines[i], qty: Math.min(20, lines[i].qty + line.qty) }
          return { lines }
        }),
      addReward: (itemId, size) => set((s) => ({ lines: [...s.lines, { itemId, size, milk: 0, syrupId: null, syrupPumps: 0, qty: 1, free: true }] })),
      setQty: (index, qty) => set((s) => ({ lines: s.lines.map((l, i) => (i === index ? { ...l, qty: Math.max(1, Math.min(20, qty)) } : l)) })),
      remove: (index) => set((s) => ({ lines: s.lines.filter((_, i) => i !== index) })),
      clear: () => set({ lines: [] }),
      setMode: (mode) => set({ mode }),
      setTable: (table) => set({ table }),
      setAddress: (address) => set({ address }),
    }),
    {
      name: 'ml-cart',
      version: 2,
      migrate: migrateCart,
      partialize: (s) => ({ lines: s.lines, mode: s.mode, table: s.table, address: s.address }),
    },
  ),
)
