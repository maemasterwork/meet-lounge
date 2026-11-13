import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../types'

export interface Toast { id: number; text: string; gold?: boolean; action?: { label: string; run: () => void } }
export type Pop = 'offers' | 'settings' | null
export type MeTab = 'orders' | 'coins' | 'favs'

interface UiState {
  lang: Lang
  theme: 'light' | 'dark' | null
  notifyOn: boolean
  favorites: string[]
  registered: string[]
  setLang: (l: Lang) => void
  setTheme: (t: 'light' | 'dark' | null) => void
  setNotify: (v: boolean) => void
  toggleFavorite: (id: string) => void
  toggleRegistered: (id: string) => void
  // session-only
  pop: Pop
  setPop: (p: Pop) => void
  meTab: MeTab
  setMeTab: (t: MeTab) => void
  selectedId: string
  select: (id: string) => void
  toasts: Toast[]
  toast: (text: string, o?: { gold?: boolean; action?: Toast['action']; ms?: number }) => void
  dismissToast: (id: number) => void
}

let tid = 0
export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      lang: 'fa',
      theme: null,
      notifyOn: true,
      favorites: ['latte', 'cheesecake'],
      registered: [],
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setNotify: (notifyOn) => set({ notifyOn }),
      toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] })),
      toggleRegistered: (id) => set((s) => ({ registered: s.registered.includes(id) ? s.registered.filter((x) => x !== id) : [...s.registered, id] })),
      pop: null,
      setPop: (pop) => set({ pop }),
      meTab: 'orders',
      setMeTab: (meTab) => set({ meTab }),
      selectedId: 'cheesecake',
      select: (selectedId) => set({ selectedId }),
      toasts: [],
      toast: (text, o) => {
        const id = ++tid
        set((s) => ({ toasts: [...s.toasts, { id, text, gold: o?.gold, action: o?.action }] }))
        setTimeout(() => get().dismissToast(id), o?.ms ?? 3600)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'ml-ui',
      version: 1,
      partialize: (s) => ({ lang: s.lang, theme: s.theme, notifyOn: s.notifyOn, favorites: s.favorites, registered: s.registered }),
    },
  ),
)
