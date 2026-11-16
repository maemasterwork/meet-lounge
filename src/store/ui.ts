import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../types'
import type { ViewName } from '../scene3d/views'

export interface Toast { id: number; text: string; gold?: boolean; action?: { label: string; run: () => void } }
export type Pop = 'offers' | 'settings' | null
export type MeTab = 'orders' | 'coins' | 'favs'
export interface AuthRequest { email?: string; phone?: string; seat?: string; registering?: boolean; signInOnly?: boolean; note?: string }

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
  authOpen: boolean
  authRequest: AuthRequest | null
  setAuthOpen: (open: boolean) => void
  requestAuth: (request: AuthRequest) => void
  meTab: MeTab
  setMeTab: (t: MeTab) => void
  selectedId: string
  select: (id: string) => void
  /** True when the Menu page shows one item's options instead of the grid. Reset when the page is left. */
  menuDetail: boolean
  setMenuDetail: (v: boolean) => void
  /** The 3D cafe behind the app: set once it is running; `view3d` is the chosen camera view (null after the visitor drags it). */
  ready3d: boolean
  setReady3d: (v: boolean) => void
  view3d: ViewName | null
  setView3d: (v: ViewName | null) => void
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
      authOpen: false,
      authRequest: null,
      setAuthOpen: (authOpen) => set({ authOpen, ...(authOpen ? {} : { authRequest: null }) }),
      requestAuth: (authRequest) => set({ authOpen: true, authRequest }),
      meTab: 'orders',
      setMeTab: (meTab) => set({ meTab }),
      selectedId: 'cheesecake',
      select: (selectedId) => set({ selectedId, menuDetail: true }),
      menuDetail: false,
      setMenuDetail: (menuDetail) => set({ menuDetail }),
      ready3d: false,
      setReady3d: (ready3d) => set({ ready3d }),
      view3d: 'corner',
      setView3d: (view3d) => set({ view3d }),
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
