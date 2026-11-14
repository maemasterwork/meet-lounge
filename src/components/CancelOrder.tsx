import { useState } from 'react'
import { useI18n } from '../i18n'
import { useUi } from '../store/ui'
import { repos } from '../repos'
import type { Order } from '../types'

/** Lets the customer cancel an order while it is still "Received" (before the cafe starts preparing it). Two taps, so it is never an accident. */
export function CancelOrder({ order, className = '' }: { order: Order; className?: string }) {
  const { t, n } = useI18n()
  const toast = useUi((s) => s.toast)
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  if (order.status !== 'new' || !order.mine) return null
  const go = async () => {
    setBusy(true)
    try { await repos.orders.cancel(order.n); toast(t('cancel.done', { n: n(order.n) })) }
    catch { toast(t('cancel.tooLate')) }
    finally { setBusy(false); setAsk(false) }
  }
  if (!ask) return <button type="button" className={`btn ghost sm cancelbtn ${className}`} onClick={() => setAsk(true)}>{t('cancel.order')}</button>
  return (
    <div className={`cancelask ${className}`} role="alertdialog" aria-label={t('cancel.title')}>
      <span className="sm">{order.paid && order.total > 0 ? t('cancel.askPaid') : t('cancel.ask')}</span>
      <span className="row" style={{ gap: 8 }}>
        <button type="button" className="btn sm danger" disabled={busy} onClick={() => void go()}>{t('cancel.yes')}</button>
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setAsk(false)}>{t('cancel.no')}</button>
      </span>
    </div>)
}
