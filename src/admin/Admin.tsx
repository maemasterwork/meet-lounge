import { useEffect, useState } from 'react'
import './admin.css'
import { useI18n } from '../i18n'
import { repos } from '../repos'
import { useRepo } from '../lib/useRepo'
import { go } from '../lib/route'
import { Icon } from '../components/icons'
import { AuthPanel } from '../components/AuthPanel'
import { useAuth } from '../lib/auth'
import type { Order, OrderStatus } from '../types'
import { Msg, Switch, useAct } from './common'
import { MenuTab } from './MenuTab'
import { CoinsTab } from './CoinsTab'
import { EventsTab } from './EventsTab'
import { OffersTab } from './OffersTab'
import { StatsTab } from './StatsTab'
import { BrandTab } from './BrandTab'

type Tab = 'orders' | 'menu' | 'coins' | 'events' | 'offers' | 'stats' | 'brand'
const TABS: [Tab, string][] = [['orders', 'admin.tabOrders'], ['menu', 'admin.tabMenu'], ['coins', 'admin.tabCoins'], ['events', 'admin.tabEvents'], ['offers', 'admin.tabOffers'], ['stats', 'admin.tabStats'], ['brand', 'admin.tabBrand']]

const COLS: OrderStatus[] = ['new', 'prep', 'ready', 'out', 'done', 'cancelled']
const NEXT: Record<string, string> = { new: 'admin.startPrep', prep: 'admin.markReady', ready: 'admin.markDone', out: 'admin.markDone' }
const MILKS = ['milk.whole', 'milk.almond', 'milk.oat']

function OrderDepositImage({ orderN }: { orderN: number }) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    void repos.orders.getDepositImage(orderN).then((image) => {
      if (active) setUrl(image)
    }).catch(() => {
      if (active) setError(true)
    })
    return () => { active = false }
  }, [orderN])

  if (error) return <span className="muted sm" role="alert">{t('err.loadFailed')}</span>
  if (!url) return <span className="muted sm" role="status">{t('loading')}</span>
  return <img className="dep-proof-image" src={url} alt={t('dep.proofPreview')} />
}

/**
 * Management dashboard: live order board for staff, plus menu, coins, offers, stats and brand tabs.
 * Staff see orders and stats; the owner role (enforced by the database, not just hidden here) manages everything.
 */
export default function Admin() {
  const { t, n, price, lang } = useI18n()
  const auth = useAuth()
  const staff = !auth.configured || auth.role === 'staff' || auth.role === 'owner'
  const orders = useRepo(() => (staff ? repos.orders.listAll() : Promise.resolve([])), [repos.orders])
  const menu = useRepo(() => (staff ? repos.admin.items() : Promise.resolve([])), [repos.admin])
  const syrups = useRepo(() => repos.syrups.list(), [repos.syrups])
  const settings = useRepo(() => repos.settings.get(), [repos.settings])
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('orders')
  const owner = !auth.configured || auth.role === 'owner'
  const shopAct = useAct()
  const archiveAct = useAct()
  const [showArchived, setShowArchived] = useState(false)
  const act = async (fn: () => Promise<Order>) => { setBusy(true); try { await fn() } finally { setBusy(false) } }
  const list = orders.data ?? []
  if (!staff) return (
    <section className="admin" aria-label={t('auth.title')}>
      <div className="ahead">
        <h2>{t('auth.title')}</h2>
        <button type="button" className="btn ghost sm" style={{ marginInlineStart: 'auto' }} onClick={() => go('home')}>{t('admin.back')} <Icon name="x" size={16} /></button>
      </div>
      <div style={{ maxWidth: 420, padding: 16 }}>
        <AuthPanel mode="staff" note={auth.email ? t('auth.noAccess') : t('auth.staffOnly')} onClose={() => go('home')} />
      </div>
    </section>)
  const fresh = list.filter((o) => !o.archived && o.status === 'new').length
  const unarchivedCount = list.filter((o) => !o.archived).length
  const visibleOrders = list.filter((o) => !!o.archived === showArchived)
  const itemLabel = (item: Order['items'][number]) => {
    const details: string[] = []
    if (item.syrupId && (item.syrupPumps ?? 0) > 0) {
      const name = syrups.data?.find((s) => s.id === item.syrupId)?.name[lang] ?? item.syrupId
      details.push(t('menu.syrupSummary', { name, n: n(item.syrupPumps ?? 0) }))
    }
    const menuItem = menu.data?.find((m) => m.id === item.itemId)
    const milkIndex = item.milk ?? (menuItem?.milk ? 0 : undefined)
    const milk = milkIndex !== undefined && (milkIndex > 0 || menuItem?.milk) ? MILKS[milkIndex] : undefined
    if (milk) details.push(t(milk))
    if (item.mugQty) details.push(t('bag.mugCount', { n: n(item.mugQty) }))
    return `${n(item.qty)}× ${t(`item.${item.itemId}.name`)}${details.length ? ` (${details.join(' · ')})` : ''}`
  }
  return (
    <section className="admin" aria-label={t('admin.title', { brand: t('brand.name') })}>
      <div className="ahead">
        <h2>{t('admin.title', { brand: t('brand.name') })}</h2>
        <span className="role">{t(owner ? 'admin.role' : 'a2.roleStaff')}</span>
        {settings.data && <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <Switch on={settings.data.shopOpen} label={t('admin.shopOpen')} disabled={!owner || shopAct.busy}
            onChange={(v) => void shopAct.run(async () => { await repos.admin.saveSettings({ shopOpen: v }); return true })} />
          {!settings.data.shopOpen && <span className="muted sm">{t('a2.shopClosedNote')}</span>}
          <Msg msg={shopAct.msg} />
        </div>}
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
      {tab === 'orders' && <div className="apane order-pane">
        <div className="order-tools">
          {orders.error && <span className="muted sm" role="alert">{t('err.loadFailed')}</span>}
          {(menu.error || syrups.error) && !orders.error && <span className="muted sm" role="alert">{t('err.loadFailed')}</span>}
          <Msg msg={archiveAct.msg} />
          <button type="button" className="btn ghost sm" aria-pressed={showArchived} onClick={() => setShowArchived((v) => !v)}>
            {t(showArchived ? 'admin.showUnarchivedOrders' : 'admin.showArchivedOrders', { n: n(list.filter((o) => o.archived).length) })}
          </button>
          {!showArchived && unarchivedCount > 0 && <button type="button" className="btn ghost sm" disabled={archiveAct.busy || orders.loading}
            onClick={() => { if (window.confirm(t('admin.confirmArchiveAll', { n: n(unarchivedCount) }))) void archiveAct.run(() => repos.orders.archiveAll()) }}>
            {t('admin.archiveAllOrders', { n: n(unarchivedCount) })}
          </button>}
          <button type="button" className="btn ghost sm" disabled={orders.loading} onClick={orders.reload}>
            <Icon name="refresh" size={16} />{t('common.refreshOrders')}
          </button>
        </div>
        <div className="board">
          {COLS.map((c) => {
            const L = visibleOrders.filter((o) => o.status === c)
            return (
              <div className="col" key={c}>
                <h3>{t(`status.${c}`)}<em>{n(L.length)}</em></h3>
                {L.length === 0 && <span className="muted sm">{t('admin.empty')}</span>}
                {L.map((o) => (
                  <div key={o.n} className={`ocard${o.mine ? ' mine' : ''}`}>
                    <div className="h"><span>#{n(o.n)}</span><span className="pillst">{t(`bag.mode${o.mode[0].toUpperCase()}${o.mode.slice(1)}`)}{o.table ? ` ${n(+o.table)}` : ''}</span></div>
                    <div className="order-items sm">
                      {o.items.map((item, index) => <div className="order-item" key={`${item.itemId}-${index}`}>{itemLabel(item)}</div>)}
                    </div>
                    <div className="muted sm">{o.who} · {price(o.total)}</div>
                    <time className="muted sm" dateTime={o.at}>{new Date(o.at).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    {o.address && <div className="muted sm">{o.address}</div>}
                    {o.comment && <div className="order-comment"><b className="sm">{t('admin.staffComment')}</b><div className="sm">{o.comment}</div></div>}
                    {o.hasDepositImage && <OrderDepositImage orderN={o.n} />}
                    {c === 'new' && !o.paid && <span className="pillst await">{t('dep.awaiting')}</span>}
                    {c === 'new' && !o.paid && <button type="button" className="btn sm" disabled={busy} onClick={() => act(() => repos.orders.markPaid(o.n))}>{t('dep.received')}</button>}
                    {NEXT[c] && !(c === 'new' && !o.paid) && <button type="button" className="btn sm" disabled={busy} onClick={() => act(() => repos.orders.advance(o.n))}>{t(NEXT[c])}</button>}
                    {c !== 'done' && c !== 'cancelled' && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => act(() => repos.orders.cancel(o.n))}>{t('admin.cancelOrder')}</button>}
                    <button type="button" className="btn ghost sm" disabled={archiveAct.busy} onClick={() => void archiveAct.run(() => repos.orders.setArchived(o.n, !o.archived))}>
                      {t(o.archived ? 'admin.restoreOrder' : 'admin.archiveOrder')}
                    </button>
                  </div>))}
              </div>)
          })}
        </div>
      </div>}
    </section>
  )
}
