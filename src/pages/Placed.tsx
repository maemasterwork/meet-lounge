import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useUi } from '../store/ui'
import { go } from '../lib/route'
import { fmtCard } from '../lib/card'
import { CancelOrder } from '../components/CancelOrder'
import { earnOfOrder } from '../lib/coins'
import { Icon } from '../components/icons'
import { qrSvg } from '../admin/qr'
import type { Order } from '../types'
import type { Settings } from '../repos/types'

export interface ReceiptLine { name: string; size: string; qty: number; free: boolean; mugQty?: number; price?: number }

async function copyText(s: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(s); return true } catch {
    try {
      const ta = document.createElement('textarea'); ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok
    } catch { return false }
  }
}

/** Shown right after checkout: thank-you, the cafe's card number for the deposit, and the receipt. */
export function Placed({ order, lines, settings, onDone, onBack }: { order: Order; lines: ReceiptLine[]; settings: Settings; onDone: () => void; onBack?: () => void }) {
  const { t, n, price, lang } = useI18n()
  const toast = useUi((s) => s.toast)
  const setMeTab = useUi((s) => s.setMeTab)
  const [copied, setCopied] = useState(false)
  const card = settings.paymentCard
  const cardQr = useMemo(() => card && /^\d{16}$/.test(card) ? qrSvg(card) : null, [card])
  const needsDeposit = settings.requireDeposit && order.total > 0
  const paid = order.paid
  const cancelled = order.status === 'cancelled'
  const when = new Date(order.at).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const copy = async (text: string, msg: string) => { if (await copyText(text)) { setCopied(true); toast(msg); setTimeout(() => setCopied(false), 2000) } }
  return (
    <article className="card bagc placed" aria-live="polite">
      <div className="bhead ltr"><span className="mt"><Icon name="bag" size={16} />{t('dep.kicker')}</span></div>
      <h2 className="script ty">{t('dep.thanks')}</h2>
      <p className="lead">{cancelled ? t('cancel.placedDone') : paid || !needsDeposit ? t('dep.readySoon') : t('dep.afterDeposit')}</p>
      {needsDeposit && !paid && !cancelled && (
        <div className="depbox" role="group" aria-label={t('dep.cardTitle')}>
          <small>{t('dep.amount')}</small>
          <b className="script amt">{price(order.total)}</b>
          {card ? (
            <>
              <small>{t('dep.cardTitle')}</small>
              <div className="cardno ltr" dir="ltr" data-testid="card-number">{fmtCard(card).replace(/\d/g, (d) => (lang === 'fa' ? n(+d) : d))}</div>
              {settings.paymentHolder && <span className="holder">{settings.paymentHolder}</span>}
              {cardQr && <div className="dep-qr">
                <div role="img" aria-label={t('dep.scanCard')} dangerouslySetInnerHTML={{ __html: cardQr }} />
                <span className="muted sm">{t('dep.scanCard')}</span>
              </div>}
              <button type="button" className="btn sm" onClick={() => copy(card, t('dep.copied'))}>{copied ? t('dep.copied') : t('dep.copy')}</button>
            </>
          ) : <span className="muted sm">{t('dep.noCard')}</span>}
          <span className="sm note">{t('dep.writeOrder', { n: n(order.n) })}</span>
        </div>)}
      <div className="rcpt">
        <div className="rh ltr"><span>{t('dep.orderNo')} {n(order.n)}</span><span>{when}</span></div>
        {lines.map((l, i) => (
          <div key={i} className="rl ltr"><span>{n(l.qty)} × {l.name}{l.size && <> <em>{l.size}</em></>}{!!l.mugQty && <> <em>({t('bag.mugCount', { n: n(l.mugQty) })})</em></>}</span>{l.price !== undefined && <span className={l.free ? 'fr' : ''}>{l.free ? t('bag.free2') : price(l.price)}</span>}</div>))}
        {order.fee > 0 && <div className="rl ltr"><span>{t('bag.fee')}</span><span>{price(order.fee)}</span></div>}
        <div className="rt ltr"><small>{t('bag.total')}</small><b className="script">{price(order.total)}</b>
          <span className={`stamp${cancelled ? ' x' : paid || !needsDeposit ? ' ok' : ''}`}>{cancelled ? t('status.cancelled') : paid || !needsDeposit ? t('dep.paid') : t('dep.awaiting')}</span></div>
      </div>
      {earnOfOrder(order) > 0 && <p className="earn sm"><Icon name="heart" size={12} />{t('bag.willEarnDone', { n: n(earnOfOrder(order)) })}</p>}
      <CancelOrder order={order} />
      <div className="row pbtn">
        <button type="button" className="btn ghost" onClick={() => { if (onBack) onBack(); else { setMeTab('orders'); go('me') } }}>{t('dep.track')}</button>
        <button type="button" className="btn" onClick={() => { onDone(); if (onBack) onBack(); else go('home') }}>{t('dep.back')}</button>
      </div>
    </article>
  )
}
