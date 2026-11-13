import { useState } from 'react'
import { useI18n } from '../i18n'
import { useShop } from '../data/context'
import { go } from '../lib/route'
import { useUi } from '../store/ui'
import { useCart } from '../store/cart'
import { Icon } from '../components/icons'
import { Frame, LoadState } from '../components/Frame'
import { ItemArt } from '../art/ItemArt'
import { MILKS, SUGARS, isDrink } from '../data/catalog'
import { lineTotal, orderTotals } from '../lib/pricing'
import { OrderError, repos } from '../repos'
import { useAuth } from '../lib/auth'
import type { CartLine, OrderMode } from '../types'

const MODES: OrderMode[] = ['pickup', 'table', 'delivery']
const ERR: Record<string, string> = {
  'address-required': 'err.addressRequired', 'shop-closed': 'err.shopClosed', 'item-unavailable': 'err.itemUnavailable', 'not-enough-coins': 'err.notEnoughCoins',
  'table-required': 'err.generic', 'phone-required': 'err.phoneRequired', 'bad-option': 'err.generic', 'reward-not-allowed': 'err.generic',
  'not-allowed': 'err.notAllowed', 'not-authenticated': 'err.network',
}

export function BagPage() {
  const { t, n, price, lang } = useI18n()
  const { data, error, reload } = useShop()
  const cart = useCart()
  const toast = useUi((s) => s.toast)
  const setMeTab = useUi((s) => s.setMeTab)
  const shopTables = useShop().data?.settings.tableCount ?? 12
  const guest = useAuth((a) => a.configured && a.isGuest)
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const frame = (c: React.ReactNode) => <Frame title={t('bag.title')} caps={t('bag.sub')}>{c}</Frame>
  if (!data) return frame(<LoadState error={error} onRetry={reload} />)

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
      const o = await repos.orders.place({ lines: cart.lines, mode: cart.mode, table: cart.table, address: cart.address, phone: guest ? phone : undefined })
      cart.clear(); setMeTab('orders'); go('me'); toast(t('bag.orderPlaced', { n: n(o.n) }))
    } catch (e) {
      setErr(t(e instanceof OrderError ? ERR[e.code] ?? 'err.generic' : 'err.network'))
    } finally { setBusy(false) }
  }

  const left = cart.lines.length === 0 ? (
    <>
      <p className="muted">{t('bag.empty')}</p>
      <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('menu')}>{t('bag.goMenu')}</button>
    </>
  ) : cart.lines.map((l, i) => {
    const it = data.byId(l.itemId)
    if (!it) return null
    return (
      <div className="row" key={i}>
        <span className="thumb"><ItemArt item={it} uid={`c${i}`} /></span>
        <span className="grow"><b>{t(`item.${it.id}.name`)}</b>{l.free && <> <span className="pillst good">{t('bag.reward')}</span></>}<br />
          <span className="muted sm">{lineLabel(l)}</span><br />
          <span className="sm">{l.free ? t('bag.free') : price(lineTotal(l, data.menu, data.offers))}</span>
          {!it.available && <><br /><span className="err">{t('err.itemUnavailable')}</span></>}</span>
        {!l.free && (
          <span className="step" style={{ height: 34 }}>
            <button type="button" onClick={() => cart.setQty(i, l.qty - 1)} aria-label={t('menu.less')} disabled={l.qty <= 1}><Icon name="minus" size={14} /></button>
            <output>{n(l.qty)}</output>
            <button type="button" onClick={() => cart.setQty(i, l.qty + 1)} aria-label={t('menu.more')} disabled={l.qty >= 20}><Icon name="plus" size={14} /></button>
          </span>)}
        <button type="button" className="ibtn" onClick={() => cart.remove(i)} aria-label={t('bag.remove')}><Icon name="trash" size={16} /></button>
      </div>)
  })

  return frame(
    <div className="body">
      <div className="two ltr">
        <div className="list">{left}</div>
        <div className="list" style={{ alignContent: 'start' }}>
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
            {cart.mode === 'delivery' && <div><span>{t('bag.fee')}</span><span>{price(totals.fee)}</span></div>}
            <div className="tot"><span>{t('bag.total')}</span><span>{price(totals.total)}</span></div>
          </div>
          <button type="button" className="btn" onClick={place} disabled={!cart.lines.length || busy || unavailable || overRewards || (guest && phone.trim().length < 6)}>{t('bag.place')}</button>
          <p className="muted sm" style={{ margin: 0 }}>{t('bag.cashNote')}</p>
        </div>
      </div>
    </div>,
  )
}
