import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { setCopyOverrides } from '../i18n'
import { ml } from '../lib/meetlounge'
import { repos } from '../repos'
import type { LedgerEntry, MenuItem, Offer, Order } from '../types'
import type { Settings } from '../repos/types'
import { useRepo } from '../lib/useRepo'

export interface ShopData {
  menu: MenuItem[]
  offers: Offer[]
  settings: Settings
  balance: number
  ledger: LedgerEntry[]
  mine: Order[]
  byId: (id: string) => MenuItem | undefined
}
interface Ctx { data: ShopData | null; error: boolean; loading: boolean; reload: () => void }
const C = createContext<Ctx>({ data: null, error: false, loading: false, reload: () => {} })

const load = () =>
  Promise.all([repos.menu.list(), repos.offers.listActive(), repos.settings.get(), repos.coins.balance(), repos.coins.ledger(), repos.orders.listMine()])

export function DataProvider({ children }: { children: ReactNode }) {
  const r = useRepo(load, [repos.menu, repos.offers, repos.settings, repos.coins, repos.orders])
  const uid = useAuth((a) => a.userId)
  const reloadRef = useRef(r.reload)
  reloadRef.current = r.reload
  const first = useRef(true)
  useEffect(() => { if (first.current) { first.current = false; return } reloadRef.current() }, [uid])
  useEffect(() => { if (r.data) applyAssets(r.data[0], r.data[2]) }, [r.data])
  const value = useMemo<Ctx>(() => {
    if (!r.data) return { data: null, error: r.error, loading: r.loading, reload: r.reload }
    const [menu, offers, settings, balance, ledger, mine] = r.data
    applyCopy(menu, settings)
    return { data: { menu, offers, settings, balance, ledger, mine, byId: (id) => menu.find((m) => m.id === id) }, error: r.error, loading: r.loading, reload: r.reload }
  }, [r.data, r.error, r.loading, r.reload])
  return <C.Provider value={value}>{children}</C.Provider>
}

export const useShop = () => useContext(C)

/** Dashboard-managed text goes into the translator (pure state, safe during render). */
function applyCopy(menu: MenuItem[], settings: Settings) {
  const o = { fa: {} as Record<string, string>, en: {} as Record<string, string> }
  for (const m of menu) {
    if (m.name) { o.fa[`item.${m.id}.name`] = m.name.fa; o.en[`item.${m.id}.name`] = m.name.en }
    if (m.desc) { o.fa[`item.${m.id}.desc`] = m.desc.fa; o.en[`item.${m.id}.desc`] = m.desc.en }
  }
  o.fa['brand.name'] = settings.brand.fa; o.en['brand.name'] = settings.brand.en
  setCopyOverrides(o)
}

/** Pictures, hero and colors are applied after render. */
const seenImages = new Set<string>()
function applyAssets(menu: MenuItem[], settings: Settings) {
  const now = new Set<string>()
  for (const m of menu) if (m.image) { now.add(m.id); if (ml.assets.items[m.id] !== m.image) ml.setItemImage(m.id, m.image) }
  for (const id of seenImages) if (!now.has(id)) ml.setItemImage(id, null)
  seenImages.clear(); now.forEach((id) => seenImages.add(id))
  if (settings.heroUrl) { if (ml.assets.hero !== settings.heroUrl) ml.setHero(settings.heroUrl) } else if (ml.assets.hero && heroFromShop) ml.setHero('')
  heroFromShop = Boolean(settings.heroUrl)
  const root = document.documentElement.style
  for (const [k, v] of [['--ml-accent', settings.accent], ['--ml-gold', settings.gold]] as const) {
    if (v) root.setProperty(k, v); else root.removeProperty(k)
  }
}
let heroFromShop = false
