import { useState } from 'react'
import './admin.css'
import { useI18n } from '../i18n'
import { repos } from '../repos'
import { useRepo } from '../lib/useRepo'
import { go } from '../lib/route'
import { Icon } from '../components/icons'
import { AuthPanel } from '../components/AuthPanel'
import { useAuth } from '../lib/auth'
import type { Order, OrderStatus } from '../types'
import { MenuTab } from './MenuTab'
import { CoinsTab } from './CoinsTab'
import { EventsTab } from './EventsTab'
import { OffersTab } from './OffersTab'
import { StatsTab } from './StatsTab'
import { BrandTab } from './BrandTab'

type Tab = 'orders' | 'menu' | 'coins' | 'events' | 'offers' | 'stats' | 'brand'
const TABS: [Tab, string][] = [['orders', 'admin.tabOrders'], ['menu', 'admin.tabMenu'], ['coins', 'admin.tabCoins'], ['events', 'admin.tabEvents'], ['offers', 'admin.tabOffers'], ['stats', 'admin.tabStats'], ['brand', 'admin.tabBrand']]

const COLS: OrderStatus[] = ['new', 'prep', 'ready', 'out', 'done']
const NEXT: Record<string, string> = { new: 'admin.startPrep', prep: 'admin.markReady', ready: 'admin.markDone', out: 'admin.markDone' }

/**
 * Management dashboard: live order board for staff, plus menu, coins, offers, stats and brand tabs.
 * Staff see orders and stats; the owner role (enforced by the database, not just hidden here) manages everything.
 */
export default function Admin() {
  const { t, n, price } = useI18n()
  const auth = useAuth()
  const staff = !auth.configured || auth.role === 'staff' || auth.role === 'owner'
  const orders = useRepo(() => (staff ? repos.orders.listAll() : Promise.resolve([])), [repos.orders])
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('orders')
  const owner = !auth.configured || auth.role === 'owner'
  const act = async (fn: () => Promise<Order>) => { setBusy(true); try { await fn() } finally { setBusy(false) } }
  const list = orders.data ?? []
  if (!staff) return (
    <section className="admin" aria-label={t('auth.title')}>
      <div className="ahead">
        <h2>{t('auth.title')}</h2>
        <button type="button" className="btn ghost sm" style={{ marginInlineStart: 'auto' }} onClick={() => go('home')}>{t('admin.back')} <Icon name="x" size={16} /></button>
      </div>
      <div style={{ maxWidth: 420, padding: 16 }}>
        <AuthPanel note={auth.email ? t('auth.noAccess') : t('auth.staffOnly')} />
      </div>
    </section>)
  const fresh = list.filter((o) => o.status === 'new').length
  return (
    <section className="admin" aria-label={t('admin.title', { brand: t('brand.name') })}>
      <div className="ahead">
        <h2>{t('admin.title', { brand: t('brand.name') })}</h2>
        <span className="role">{t(owner ? 'admin.role' : 'a2.roleStaff')}</span>
        <button type="button" className="btn ghost sm" style={{ marginInlineStart: 'auto' }} onClick={() => go('home')}>{t('admin.back')} <Icon name="x" size={16} /></button>
      </div>
      <div className="atabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {t(label)}{k === 'orders' && fresh ? ` (${t('admin.newCount', { n: n(fresh) })})` : ''}
          </button>))}
      </div>
      {tab === 'menu' && <MenuTab owner={owner} />}
      {tab === 'coins' && <CoinsTab owner={owner} />}
      {tab === 'events' && <EventsTab owner={owner} />}
      {tab === 'offers' && <OffersTab owner={owner} />}
      {tab === 'stats' && <StatsTab />}
      {tab === 'brand' && <BrandTab owner={owner} />}
      {tab === 'orders' && <div className="apane">
        <div className="board">
          {COLS.map((c) => {
            const L = list.filter((o) => o.status === c)
            return (
              <div className="col" key={c}>
                <h3>{t(`status.${c}`)}<em>{n(L.length)}</em></h3>
                {L.length === 0 && <span className="muted sm">{t('admin.empty')}</span>}
                {L.map((o) => (
                  <div key={o.n} className={`ocard${o.mine ? ' mine' : ''}`}>
                    <div className="h"><span>#{n(o.n)}</span><span className="pillst">{t(`bag.mode${o.mode[0].toUpperCase()}${o.mode.slice(1)}`)}{o.table ? ` ${n(+o.table)}` : ''}</span></div>
                    <div className="sm">{o.items.map((i) => `${n(i.qty)}× ${t(`item.${i.itemId}.name`)}`).join(', ')}</div>
                    <div className="muted sm">{o.who} · {price(o.total)}</div>
                    {o.address && <div className="muted sm">{o.address}</div>}
                    {c === 'new' && !o.paid && <span className="pillst await">{t('dep.awaiting')}</span>}
                    {c === 'new' && !o.paid && <button type="button" className="btn sm" disabled={busy} onClick={() => act(() => repos.orders.markPaid(o.n))}>{t('dep.received')}</button>}
                    {NEXT[c] && !(c === 'new' && !o.paid) && <button type="button" className="btn sm" disabled={busy} onClick={() => act(() => repos.orders.advance(o.n))}>{t(NEXT[c])}</button>}
                    {c !== 'done' && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => act(() => repos.orders.cancel(o.n))}>{t('admin.cancelOrder')}</button>}
                  </div>))}
              </div>)
          })}
        </div>
      </div>}
    </section>
  )
}
