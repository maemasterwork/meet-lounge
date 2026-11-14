import { useState } from 'react'
import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go } from '../lib/route'
import { useUi } from '../store/ui'
import { useCart } from '../store/cart'
import { Icon } from '../components/icons'
import { LoadState } from '../components/Frame'
import { HomeScene } from '../components/HomeScene'
import { ItemArt } from '../art/ItemArt'
import { MILKS, SUGARS, isDrink } from '../data/catalog'
import { lineTotal, orderTotals } from '../lib/pricing'
import { OrderError, repos } from '../repos'
import { useAuth } from '../lib/auth'
import { Placed, type ReceiptLine } from './Placed'
import type { CartLine, Order, OrderMode } from '../types'

const MODES: OrderMode[] = ['pickup', 'table', 'delivery']
const ERR: Record<string, string> = {
  'address-required': 'err.addressRequired', 'shop-closed': 'err.shopClosed', 'item-unavailable': 'err.itemUnavailable', 'not-enough-coins': 'err.notEnoughCoins',
  'table-required': 'err.generic', 'phone-required': 'err.phoneRequired', 'bad-option': 'err.generic', 'reward-not-allowed': 'err.generic',
  'deposit-required': 'err.generic', 'order-closed': 'err.generic', 'not-allowed': 'err.notAllowed', 'not-authenticated': 'err.network',
}

export function BagPage() {
  const { t, n, price, lang } = useI18n()
  const { data, error, reload } = useShop()
  const cart = useCart()
  const toast = useUi((s) => s.toast)
  const shopTables = useShop().data?.settings.tableCount ?? 12
  const guest = useAuth((a) => a.configured && a.isGuest)
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [placed, setPlaced] = useState<{ order: Order; lines: ReceiptLine[] } | null>(null)
  const scene = (c: React.ReactNode) => <HomeScene active="bag" className="isbag">{c}</HomeScene>
  if (!data) return scene(<article className="card bagc"><LoadState error={error} onRetry={reload} /></article>)

  const lineLabel = (l: CartLine) => {
    const it = data.byId(l.itemId)
    if (!it) return ''
    const parts = [t(`size.${l.size}`)]
    if (it.milk) parts.push(t(MILKS[l.milk].key))
    if (isDrink(it)) parts.push(t(SUGARS[l.sugar]))
    return parts.join(lang === 'fa' ? '، ' : ', ')
  }
  const totals = orderTotals(cart.lines, data.menu, data.offers, cart.mode, data.settings.deliveryFee)
  const freeCount = cart.lines.filter((l) => l.free).length
  const overRewards = freeCount * data.settings.rewardEvery > data.balance
  const unavailable = cart.lines.some((l) => !data.byId(l.itemId)?.available)

  const place = async () => {
    setBusy(true); setErr('')
    try {
      const snap: ReceiptLine[] = cart.lines.map((l) => ({ name: t(`item.${l.itemId}.name`), size: t(`size.${l.size}`), qty: l.qty, free: l.free, price: lineTotal(l, data.menu, data.offers) }))
      const o = await repos.orders.place({ lines: cart.lines, mode: cart.mode, table: cart.table, address: cart.address, phone: guest ? phone : undefined })
      cart.clear(); setPlaced({ order: o, lines: snap }); toast(t('bag.orderPlaced', { n: n(o.n) }))
    } catch (e) {
      setErr(t(e instanceof OrderError ? ERR[e.code] ?? 'err.generic' : 'err.network'))
    } finally { setBusy(false) }
  }

  const treats = cart.lines.reduce((a, l) => a + l.qty, 0)
  const rewardLines = cart.lines.filter((l) => l.free)
  const lineSub = (l: CartLine) => {
    const it = data.byId(l.itemId)
    if (!it) return ''
    return l.free ? t('bag.rewardSub', { n: n(data.settings.rewardEvery) }) : `${lineLabel(l)} · ${t('bag.each', { price: price(lineTotal({ ...l, qty: 1 }, data.menu, data.offers)) })}`
  }

  const rows = cart.lines.map((l, i) => {
    const it = data.byId(l.itemId)
    if (!it) return null
    return (
      <div className={`bl ltr${l.free ? ' perk' : ''}`} key={i}>
        <span className="im"><ItemArt item={it} uid={`c${i}`} /></span>
        <span className="tx">
          <b className="nm">{t(`item.${it.id}.name`)}</b>
          <span className="sb">{lineSub(l)}</span>
          {!it.available && <span className="err">{t('err.itemUnavailable')}</span>}
        </span>
        {l.free ? <span className="onus"><Icon name="heart" size={11} />{t('bag.onUs')}</span> : (
          <span className="step" role="group" aria-label={t('menu.optQty')}>
            <button type="button" onClick={() => cart.setQty(i, l.qty - 1)} aria-label={t('menu.less')} disabled={l.qty <= 1}><Icon name="minus" size={13} /></button>
            <output>{n(l.qty)}</output>
            <button type="button" onClick={() => cart.setQty(i, l.qty + 1)} aria-label={t('menu.more')} disabled={l.qty >= 20}><Icon name="plus" size={13} /></button>
          </span>)}
        <span className={`lp${l.free ? ' fr' : ''}`}>{l.free ? t('bag.free2') : price(lineTotal(l, data.menu, data.offers))}</span>
        <button type="button" className="x" onClick={() => cart.remove(i)} aria-label={t('bag.remove')}><Icon name="x" size={14} /></button>
      </div>)
  })

  if (placed) {
    const live = data.mine.find((m) => m.n === placed.order.n) ?? placed.order
    return scene(<Placed order={live} lines={placed.lines} settings={data.settings} onDone={() => setPlaced(null)} />)
  }
  return scene(
    <article className="card bagc">
      <div className="bhead ltr">
        <span className="mt"><Icon name="bag" size={16} />{t('nav.bag')}</span>
        {treats > 0 && <span className="treats">{t(treats === 1 ? 'bag.treat1' : 'bag.treats', { n: n(treats) })}</span>}
      </div>
      <div className="bh ltr">
        <h2 className="script">{t('bag.basketTitle')}</h2>
        <button type="button" className="addmore" onClick={() => go('menu')}>{t('bag.addMore')} <Icon name="arrowL" size={14} /></button>
      </div>
      <div className="blist">
        {cart.lines.length === 0 ? (
          <div className="bempty"><p className="muted">{t('bag.empty')}</p><button type="button" className="btn sm" onClick={() => go('menu')}>{t('bag.goMenu')}</button></div>
        ) : rows}
        {rewardLines.length > 0 && (
          <div className="gnote ltr">
            <span>{t('bag.giftNote', { name: rewardLines.map((l) => t(`item.${l.itemId}.name`)).join(lang === 'fa' ? '، ' : ', ') })}</span>
            <svg viewBox="0 0 120 14" aria-hidden="true"><path d="M2 4 C20 14 40 14 60 6 S100 0 118 8" fill="none" stroke="var(--ml-sage)" strokeWidth="1.4" /><circle cx="26" cy="11" r="2.4" fill="var(--ml-accent)" /><circle cx="62" cy="6" r="2.4" fill="var(--ml-accent)" /><circle cx="96" cy="4" r="2.4" fill="var(--ml-accent)" /></svg>
          </div>)}
      </div>
      <div className="bfoot">
        <div className="seg" role="group" aria-label={t('bag.modeLabel')}>
          {MODES.map((m) => <button key={m} type="button" aria-pressed={cart.mode === m} onClick={() => { cart.setMode(m); setErr('') }}>{t(`bag.mode${m[0].toUpperCase()}${m.slice(1)}`)}</button>)}
        </div>
        {cart.mode === 'table' && (
          <label className="field">{t('bag.tableLabel')}
            <select value={cart.table} onChange={(e) => cart.setTable(e.target.value)}>
              {Array.from({ length: Math.max(shopTables, Number(cart.table) || 0) }, (_, i) => <option key={i} value={String(i + 1)}>{n(i + 1)}</option>)}
            </select>
          </label>)}
        {cart.mode === 'delivery' && (
          <label className="field">{t('bag.addressLabel')}
            <textarea rows={2} value={cart.address} placeholder={t('bag.addressHint')} onChange={(e) => cart.setAddress(e.target.value)} maxLength={300} />
          </label>)}
        {guest && (
          <label className="field">{t('bag.phoneLabel')}
            <input type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={phone} placeholder="09123456789" onChange={(e) => setPhone(e.target.value)} maxLength={20} />
          </label>)}
        {err && <p className="err" role="alert">{err}</p>}
        <div className="sum">
          <div><span>{t('bag.subtotal')}</span><span>{price(totals.subtotal)}</span></div>
          {rewardLines.map((l, i) => <div key={i} className="ital"><span>{t('bag.rewardLine', { name: t(`item.${l.itemId}.name`) })}</span><span>{t('bag.free2')}</span></div>)}
          {cart.mode === 'delivery' && <div><span>{t('bag.fee')}</span><span>{price(totals.fee)}</span></div>}
        </div>
        <div className="btot ltr">
          <div className="tt"><small>{t('bag.total')}</small><b className="script tot">{price(totals.total)}</b></div>
          <button type="button" className="btn checkout" onClick={place} disabled={!cart.lines.length || busy || unavailable || overRewards || (guest && phone.trim().length < 6)}>{t('bag.checkout')} <Icon name="arrowL" size={16} /></button>
        </div>
        <p className="muted sm cash">{data.settings.requireDeposit ? t('dep.bagNote') : t('bag.cashNote')}</p>
      </div>
    </article>,
  )
}
