import { CancelOrder } from '../components/CancelOrder'
import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go } from '../lib/route'
import { useUi, type MeTab } from '../store/ui'
import { useCart } from '../store/cart'
import { Frame, LoadState } from '../components/Frame'
import { Icon } from '../components/icons'
import { ItemArt } from '../art/ItemArt'
import { canTakeReward, coinsToNext, isAvailable, nextRewardCost, rewardCostOf, stockLeft } from '../lib/coins'
import type { Order } from '../types'

const STEPS: Record<Order['mode'], Order['status'][]> = {
  pickup: ['new', 'prep', 'ready', 'done'], table: ['new', 'prep', 'ready', 'done'], delivery: ['new', 'prep', 'ready', 'out', 'done'],
}

function Ring({ c, total, size = 210, sw = 15 }: { c: number; total: number; size?: number; sw?: number }) {
  const r = (size - sw) / 2, L = 2 * Math.PI * r, f = Math.max(0, Math.min(1, c / total))
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ maxWidth: '100%', height: 'auto' }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ml-line)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ml-gold)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${(L * f).toFixed(1)} ${L.toFixed(1)}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

export function MePage() {
  const { t, n, price, lang } = useI18n()
  const { data, error, loading, reload } = useShop()
  const tab = useUi((s) => s.meTab)
  const setTab = useUi((s) => s.setMeTab)
  const favs = useUi((s) => s.favorites)
  const select = useUi((s) => s.select)
  const toast = useUi((s) => s.toast)
  const cart = useCart()
  const frame = (c: React.ReactNode) => <Frame title={t('me.title')} caps={t('me.sub')}>{c}</Frame>
  if (!data) return frame(<LoadState error={error} onRetry={reload} />)

  const tabs: [MeTab, string][] = [['orders', 'me.tabOrders'], ['coins', 'me.tabCoins'], ['favs', 'me.tabFavs']]
  let content: React.ReactNode
  if (tab === 'orders') {
    content = (
      <div className="list">
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost sm" disabled={loading} onClick={reload}>
            <Icon name="refresh" size={16} />{t('common.refreshOrders')}
          </button>
        </div>
        {error && <p className="muted sm" role="alert">{t('err.loadFailed')}</p>}
        {data.mine.length === 0 ? <p className="muted">{t('me.ordersEmpty')}</p> : data.mine.map((o) => {
          const st = STEPS[o.mode], ci = st.indexOf(o.status)
          return (
            <div className="row" style={{ display: 'block' }} key={o.n}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{t('me.orderN', { n: n(o.n) })}</b><span className={`pillst${o.status === 'done' ? ' good' : ''}`}>{o.status === 'new' && !o.paid ? t('dep.awaiting') : t(`status.${o.status}`)}</span></div>
              <div className="muted sm">{t(`bag.mode${o.mode[0].toUpperCase()}${o.mode.slice(1)}`)}{o.table ? ` ${n(+o.table)}` : ''}{o.address ? ` · ${o.address}` : ''} · {price(o.total)}</div>
              <div className="sm">{o.items.map((i) => `${n(i.qty)}× ${t(`item.${i.itemId}.name`)}${i.free ? ` (${t('bag.reward')})` : ''}`).join(lang === 'fa' ? '، ' : ', ')}</div>
              <CancelOrder order={o} />
              {o.status !== 'cancelled' && <div className="stepper">{st.map((s, i) => <div key={s} className={`s${i < ci ? ' on' : ''}${i === ci ? ' cur' : ''}`}>{t(`status.${s}`)}</div>)}</div>}
            </div>)
        })}
      </div>)
  } else if (tab === 'coins') {
    const N = nextRewardCost(data.menu, data.settings.rewardEvery), ready = data.balance >= N, elig = data.menu.filter((m) => m.rewardEligible)
    const committed = rewardCostOf(cart.lines, data.menu)
    content = (
      <div className="two ltr">
        <div className="ringbox">
          <div style={{ position: 'relative', width: 'min(100%,210px)' }}>
            <Ring c={Math.min(data.balance, N)} total={N} />
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center' }}>
              <b style={{ fontSize: 42, lineHeight: 1, fontFamily: 'var(--ml-font-script)' }}>{n(data.balance)}</b><span className="muted">{t('coins.ofN', { n: n(N) })}</span>
            </div>
          </div>
          <div className="dots" aria-hidden="true">{Array.from({ length: N }, (_, i) => <i key={i} className={i < data.balance ? 'on' : ''} />)}</div>
          <p className="muted" style={{ margin: 0 }}>{t('coins.explain')}<br />{ready ? t('coins.ready') : t('coins.left', { n: n(coinsToNext(data.balance, N)) })}</p>
        </div>
        <div className="list">
          <b>{ready ? t('coins.pick') : t('coins.rewardItems')}</b>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))' }}>
            {elig.map((m) => (
              <div className="gc" key={m.id}>
                <div className="im" style={{ height: 80 }}><ItemArt item={m} uid={`r${m.id}`} /></div>
                <b style={{ fontSize: 14 }}>{t(`item.${m.id}.name`)}</b>
                {canTakeReward(data.balance, m.rewardCost, committed) && isAvailable(m) && stockLeft(m, cart.lines) >= 1
                  ? <button type="button" className="btn gold sm" onClick={() => { cart.addReward(m.id, m.sizes[0].key); toast(t('menu.freeAddedToast', { name: t(`item.${m.id}.name`) }), { gold: true, action: { label: t('menu.openBag'), run: () => go('bag') } }) }}>{t('coins.claim')}</button>
                    : <span className="muted sm">{isAvailable(m) ? t('coins.needs', { n: n(m.rewardCost) }) : t('menu.soldOut')}</span>}
                {canTakeReward(data.balance, m.rewardCost, committed) && isAvailable(m) && <small className="muted">{t('coins.costs', { n: n(m.rewardCost) })}</small>}
              </div>))}
          </div>
          <b>{t('coins.history')}</b>
          {data.ledger.slice(0, 5).map((l) => (
            <div className="row" key={l.id}>
              <span className={`pillst${l.delta > 0 ? ' good' : ''}`}>{l.delta > 0 ? '+' : '−'}{n(Math.abs(l.delta))}</span>
              <span className="grow">{l.orderN ? t('me.orderN', { n: n(l.orderN) }) : t('coins.rewardItems')}</span>
              <span className="muted sm">{new Date(l.at).toLocaleTimeString(lang === 'fa' ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>))}
        </div>
      </div>)
  } else {
    const f = data.menu.filter((m) => favs.includes(m.id))
    content = f.length === 0 ? <p className="muted">{t('me.favsEmpty')}</p> : (
      <div className="grid">{f.map((m) => (
        <button key={m.id} type="button" className="gc" onClick={() => { select(m.id); go('menu') }}><div className="im"><ItemArt item={m} uid={`f${m.id}`} /></div><b>{t(`item.${m.id}.name`)}</b></button>))}
      </div>)
  }
  return frame(
    <div className="body">
      <div className="tabsm" role="tablist">{tabs.map(([k, label]) => <button key={k} type="button" role="tab" className="pill" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{t(label)}</button>)}</div>
      {content}
    </div>,
  )
}
