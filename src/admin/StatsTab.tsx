import { useI18n } from '../i18n'
import { repos } from '../repos'
import { useRepo } from '../lib/useRepo'
import { downloadOrdersCsv } from './export-orders'
import { computeStats } from './stats'

export function StatsTab() {
  const { t, n, price, lang } = useI18n()
  const orders = useRepo(() => repos.orders.listAll(), [repos.orders])
  const ledger = useRepo(() => repos.admin.ledgerAll().catch(() => []), [repos.admin, repos.coins])
  const menu = useRepo(() => repos.admin.items(), [repos.admin])
  const s = computeStats(orders.data ?? [])
  const today = new Date().toDateString()
  const coinsToday = (ledger.data ?? []).filter((l) => l.reason === 'earn' && new Date(l.at).toDateString() === today).length
  const name = (id: string) => menu.data?.find((i) => i.id === id)?.name[lang] ?? t(`item.${id}.name`)
  const maxH = Math.max(1, ...s.hourly), maxD = Math.max(1, ...s.days.map((d) => d.sales))
  const hours = s.hourly.map((v, h) => ({ v, h })).filter(({ h }) => h >= 7 && h <= 23)
  const weekday = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', { weekday: 'short' })
  return (
    <div className="apane" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div className="kpis">
        <div className="kpi"><small>{t('admin.totalSales')}</small><b>{price(s.lifetime.sales)}</b><small>{t('admin.totalOrders', { n: n(s.lifetime.count), cancelled: n(s.lifetime.cancelled) })}</small></div>
        <div className="kpi"><small>{t('admin.monthSales')}</small><b>{price(s.month.sales)}</b><small>{t('admin.totalOrders', { n: n(s.month.count), cancelled: n(s.month.cancelled) })}</small></div>
      </div>
      <div className="order-tools">
        {orders.error && <span className="muted sm" role="alert">{t('err.loadFailed')}</span>}
        <button type="button" className="btn ghost sm" disabled={orders.loading || !orders.data?.length} onClick={() => downloadOrdersCsv(orders.data ?? [])}>
          {t('admin.exportOrders')}
        </button>
      </div>
      <div className="panel">
        <h3>{t('admin.monthStatus')}</h3>
        <div className="chips">{Object.entries(s.month.statuses).map(([status, count]) => (
          <span className="pillst" key={status}>{t(`status.${status}`)}: {n(count)}</span>
        ))}</div>
      </div>
      <div className="kpis">
        <div className="kpi"><small>{t('admin.kpiSales')}</small><b>{price(s.sales)}</b></div>
        <div className="kpi"><small>{t('admin.kpiOrders')}</small><b>{n(s.count)}</b>{s.cancelled > 0 && <small>{t('a2.cancelled')}: {n(s.cancelled)}</small>}</div>
        <div className="kpi"><small>{t('admin.kpiBasket')}</small><b>{price(s.basket)}</b></div>
        <div className="kpi"><small>{t('admin.kpiCoins')}</small><b>{n(coinsToday)}</b>{s.rewardsUsed > 0 && <small>{t('a2.rewardsUsed')}: {n(s.rewardsUsed)}</small>}</div>
      </div>
      <div className="twocol">
        <div className="panel">
          <h3>{t('admin.hourlySales')}{s.peakHour !== null && <span className="muted sm"> · {t('admin.peak', { h: n(s.peakHour) })}</span>}</h3>
          {s.count === 0 ? <p className="muted">{t('a2.noData')}</p> : (
            <svg viewBox="0 0 340 120" role="img" aria-label={t('admin.hourlySales')} style={{ width: '100%', height: 'auto' }}>
              {hours.map(({ v, h }, i) => {
                const bh = Math.round((v / maxH) * 90)
                return <g key={h}><rect x={i * 20 + 2} y={100 - bh} width={15} height={bh} rx={3} fill={h === s.peakHour ? 'var(--ml-accent)' : 'var(--ml-sage)'} />
                  {h % 2 === 1 && <text x={i * 20 + 9.5} y={114} textAnchor="middle" fontSize="9" fill="var(--ml-ink-2)">{n(h)}</text>}</g>
              })}
            </svg>)}
        </div>
        <div className="panel">
          <h3>{t('admin.bestSellers')}</h3>
          {s.top.length === 0 ? <p className="muted">{t('a2.noData')}</p> : (
            <div className="bars">{s.top.map((x) => <div className="bar" key={x.itemId}><span>{name(x.itemId)}</span><i style={{ width: `${(x.qty / s.top[0].qty) * 100}%` }} /><span>{n(x.qty)}</span></div>)}</div>)}
        </div>
      </div>
      <div className="panel">
        <h3>{t('a2.days7')}</h3>
        <svg viewBox="0 0 340 130" role="img" aria-label={t('a2.days7')} style={{ width: '100%', height: 'auto' }}>
          {s.days.map((d, i) => {
            const bh = Math.round((d.sales / maxD) * 90)
            return <g key={d.date}><rect x={i * 48 + 6} y={100 - bh} width={36} height={bh} rx={4} fill={i === 6 ? 'var(--ml-accent)' : 'var(--ml-sage)'} />
              <text x={i * 48 + 24} y={116} textAnchor="middle" fontSize="10" fill="var(--ml-ink-2)">{weekday(d.date)}</text></g>
          })}
        </svg>
      </div>
    </div>)
}
