import { useState } from 'react'
import { useI18n } from '../i18n'
import { repos, type Customer } from '../repos'
import { useRepo } from '../lib/useRepo'
import { Msg, Switch, useAct } from './common'

function Adjust({ c, act }: { c: Customer; act: ReturnType<typeof useAct> }) {
  const { t } = useI18n()
  const [amt, setAmt] = useState('')
  const [note, setNote] = useState('')
  const d = Math.trunc(Number(amt))
  const ok = Number.isFinite(d) && d !== 0 && note.trim().length > 0 && c.balance + d >= 0
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      <input type="number" dir="ltr" style={{ width: 80 }} aria-label={t('a2.amount')} placeholder="+1" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <input style={{ width: 150 }} aria-label={t('admin.reason')} placeholder={t('admin.reason')} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className="btn ghost sm" disabled={act.busy || !ok} onClick={async () => { if ((await act.run(() => repos.admin.adjustCoins(c.id, d, note.trim()))) !== undefined) { setAmt(''); setNote('') } }}>{t('a2.apply')}</button>
    </div>)
}

export function CoinsTab({ owner }: { owner: boolean }) {
  const { t, n, lang, price } = useI18n()
  const settings = useRepo(() => repos.settings.get(), [repos.settings])
  const items = useRepo(() => repos.admin.items(), [repos.admin])
  const customers = useRepo(() => (owner ? repos.admin.customers() : Promise.resolve([])), [repos.admin, repos.coins])
  const ledger = useRepo(() => (owner ? repos.admin.ledgerAll() : Promise.resolve([])), [repos.admin, repos.coins])
  const act = useAct()
  const N = settings.data?.rewardEvery ?? 6
  const [every, setEvery] = useState<string | null>(null)
  const shown = every ?? String(N)
  const ev = Math.round(Number(shown))
  const valid = Number.isFinite(ev) && ev >= 2 && ev <= 50
  const cs = customers.data ?? []
  const near = cs.filter((c) => N - (c.balance % N) <= 2 && c.balance % N !== 0).length
  return (
    <div className="apane" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div className="twocol">
        <div className="panel">
          <h3>{t('admin.coinRule')}</h3>
          <label className="field">{t('admin.coinRuleText')}
            <input type="number" dir="ltr" min={2} max={50} value={shown} disabled={!owner} onChange={(e) => setEvery(e.target.value)} />
          </label>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <button type="button" className="btn sm" disabled={act.busy || !owner || !valid || ev === N} onClick={async () => { if (await act.run(async () => { await repos.admin.saveSettings({ rewardEvery: ev }); return true })) setEvery(null) }}>{t('common.save')}</button>
            {owner && <span className="muted sm">{t('a2.nearCount', { n: n(near) })}</span>}
          </div>
          <Msg msg={act.msg} />
        </div>
        <div className="panel">
          <h3>{t('admin.eligibleItems')}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {(items.data ?? []).filter((i) => !i.archived).map((i) => (
              <div key={i.id} className="row" style={{ gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{i.name[lang]} <span className="muted sm">{price(i.price)}</span></span>
                <Switch on={i.rewardEligible} label={i.name[lang]} disabled={!owner || act.busy} onChange={(v) => void act.run(() => repos.admin.saveItem(i.id, { rewardEligible: v }))} />
              </div>))}
          </div>
        </div>
      </div>
      {owner && (
        <div className="panel">
          <h3>{t('a2.customers')}</h3>
          {cs.length === 0 ? <p className="muted">{t('a2.noCustomers')}</p> : (
            <div className="tblw"><table>
              <thead><tr><th>{t('a2.customer')}</th><th>{t('a2.balance')}</th><th>{t('a2.ordersCount')}</th><th>{t('admin.adjust')}</th></tr></thead>
              <tbody>{cs.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name || '—'}</b>{c.phone && <><br /><span className="muted sm" dir="ltr">{c.phone}</span></>}</td>
                  <td>{n(c.balance)} <span className="muted sm">/ {n(N)}</span></td>
                  <td>{n(c.orders)}</td>
                  <td><Adjust c={c} act={act} /></td>
                </tr>))}</tbody>
            </table></div>)}
        </div>)}
      {owner && (
        <div className="panel">
          <h3>{t('a2.ledgerAll')}</h3>
          {(ledger.data ?? []).length === 0 ? <p className="muted">{t('a2.noData')}</p> : (
            <div className="tblw"><table><tbody>
              {(ledger.data ?? []).slice(0, 40).map((l) => (
                <tr key={l.id}>
                  <td className="muted sm">{new Date(l.at).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{l.customer || '—'}</td>
                  <td>{t(`a2.reason.${l.reason}`)}{l.orderN ? ` #${n(l.orderN)}` : ''}</td>
                  <td dir="ltr" style={{ textAlign: 'end', fontWeight: 700 }}>{l.delta > 0 ? `+${n(l.delta)}` : `−${n(-l.delta)}`}</td>
                </tr>))}
            </tbody></table></div>)}
        </div>)}
    </div>)
}
