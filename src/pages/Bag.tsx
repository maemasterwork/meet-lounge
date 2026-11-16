import { useEffect, useRef, useState } from 'react'
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
import { earnFor, isAvailable, rewardCostOf, stockLeft } from '../lib/coins'
import { OrderError, repos } from '../repos'
import { useAuth } from '../lib/auth'
import { Placed, type ReceiptLine } from './Placed'
import type { CartLine, Order, OrderMode } from '../types'

const MODES: OrderMode[] = ['pickup', 'delivery']
const ERR: Record<string, string> = {
  'address-required': 'err.addressRequired', 'shop-closed': 'err.shopClosed', 'item-unavailable': 'err.itemUnavailable', 'out-of-stock': 'err.outOfStock', 'not-enough-coins': 'err.notEnoughCoins',
  'table-required': 'err.generic', 'phone-required': 'err.phoneRequired', 'bad-option': 'err.generic', 'reward-not-allowed': 'err.generic',
  'deposit-required': 'err.generic', 'order-closed': 'err.generic', 'not-allowed': 'err.notAllowed', 'not-authenticated': 'err.network',
}

export function BagPage() {
  const { t, n, price, lang } = useI18n()
  const { data, error, reload } = useShop()
  const cart = useCart()
  const toast = useUi((s) => s.toast)
  const shopTables = useShop().data?.settings.tableCount ?? 12
  const auth = useAuth()
  const guest = auth.configured && auth.isGuest
  const requestAuth = useUi((s) => s.requestAuth)
  const [phone, setPhone] = useState('')
  const [phoneLookupBusy, setPhoneLookupBusy] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [placed, setPlaced] = useState<{ order: Order; lines: ReceiptLine[] } | null>(null)
  const importedAddressFor = useRef<string | null>(null)
  const scene = (c: React.ReactNode) => <HomeScene active="bag" className="isbag">{c}</HomeScene>
  useEffect(() => {
    if (!auth.userId || guest) { importedAddressFor.current = null; return }
    if (cart.mode === 'delivery' && auth.profile?.seat.trim() && importedAddressFor.current !== auth.userId) {
      cart.setAddress(auth.profile.seat)
      importedAddressFor.current = auth.userId
    }
  }, [auth.userId, auth.profile?.seat, guest, cart.mode])
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
  const overRewards = rewardCostOf(cart.lines, data.menu) > data.balance
  const unavailable = cart.lines.some((l) => { const m = data.byId(l.itemId); return !m || !isAvailable(m) || stockLeft(m, cart.lines) === 0 && m.stock !== null && cart.lines.filter((x) => x.itemId === m.id).reduce((a, x) => a + x.qty, 0) > m.stock })
  const earn = earnFor(cart.lines, data.menu)

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
  const importCustomer = async () => {
    setPhoneLookupBusy(true); setErr('')
    let result: Awaited<ReturnType<typeof auth.lookupCustomerEmail>>
    try { result = await auth.lookupCustomerEmail(phone.trim()) }
    catch { setErr(t('bag.customerLookupFailed')); return }
    finally { setPhoneLookupBusy(false) }
    if (result.error) { setErr(t('bag.customerLookupFailed')); return }
    if (result.email) {
      requestAuth({ email: result.email, signInOnly: true, note: 'auth.phoneAccountFound' })
    } else {
      requestAuth({ phone: phone.trim(), seat: cart.mode === 'delivery' ? cart.address : '', registering: true, note: 'auth.phoneNoAccount' })
    }
  }

  const treats = cart.lines.reduce((a, l) => a + l.qty, 0)
  const rewardLines = cart.lines.filter((l) => l.free)
  const lineSub = (l: CartLine) => {
    const it = data.byId(l.itemId)
    if (!it) return ''
    return l.free ? t('bag.rewardSub', { n: n(it.rewardCost) }) : `${lineLabel(l)} · ${t('bag.each', { price: price(lineTotal({ ...l, qty: 1 }, data.menu, data.offers)) })}`
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
          {!isAvailable(it) && <span className="err">{t(it.stock === 0 ? 'menu.soldOut' : 'err.itemUnavailable')}</span>}
          {isAvailable(it) && it.stock !== null && cart.lines.filter((x) => x.itemId === it.id).reduce((a, x) => a + x.qty, 0) > it.stock && <span className="err">{t('menu.onlyLeft', { n: n(it.stock) })}</span>}
        </span>
        {l.free ? <span className="onus"><Icon name="heart" size={11} />{t('bag.onUs')}</span> : (
          <span className="step" role="group" aria-label={t('menu.optQty')}>
            <button type="button" onClick={() => cart.setQty(i, l.qty - 1)} aria-label={t('menu.less')} disabled={l.qty <= 1}><Icon name="minus" size={13} /></button>
            <output>{n(l.qty)}</output>
            <button type="button" onClick={() => cart.setQty(i, l.qty + 1)} aria-label={t('menu.more')} disabled={l.qty >= 20 || stockLeft(it, cart.lines) < 1}><Icon name="plus" size={13} /></button>
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
        {guest && <button type="button" className="btn ghost sm" style={{ alignSelf: 'start' }} disabled={phoneLookupBusy || !/^\+?[0-9 ()-]{6,20}$/.test(phone.trim())} onClick={() => void importCustomer()}>
          {phoneLookupBusy ? t('bag.customerLookupBusy') : t('bag.importCustomer')}
        </button>}
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
        {earn > 0 && <p className="earn sm"><Icon name="heart" size={12} />{t('bag.willEarn', { n: n(earn) })}</p>}
        <p className="muted sm cash">{data.settings.requireDeposit ? t('dep.bagNote') : t('bag.cashNote')}</p>
      </div>
    </article>,
  )
}
