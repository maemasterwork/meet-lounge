import { useState } from 'react'
import { useI18n } from '../i18n'
import { repos, type Customer } from '../repos'
import { useRepo } from '../lib/useRepo'
import { Msg, NumInput, Switch, useAct } from './common'

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
  const dflt = settings.data?.rewardEvery ?? 6
  const [every, setEvery] = useState<string | null>(null)
  const shown = every ?? String(dflt)
  const ev = Math.round(Number(shown))
  const valid = Number.isFinite(ev) && ev >= 2 && ev <= 50
  const mugDflt = settings.data?.reusableMugDiscount ?? 10000
  const [mugDiscount, setMugDiscount] = useState<string | null>(null)
  const mugShown = mugDiscount ?? String(mugDflt)
  const mugValue = Math.trunc(Number(mugShown))
  const mugValid = Number.isFinite(mugValue) && mugValue >= 0 && mugValue <= 2147483647
  const list = (items.data ?? []).filter((i) => !i.archived)
  const rewards = list.filter((i) => i.rewardEligible)
  const cheapest = rewards.length ? Math.min(...rewards.map((i) => i.rewardCost)) : dflt
  const cs = customers.data ?? []
  const led = ledger.data ?? []
  const inCirculation = cs.reduce((a, c) => a + c.balance, 0)
  const issued = led.filter((l) => l.delta > 0 && l.reason !== 'refund').reduce((a, l) => a + l.delta, 0)
  const redeemed = led.filter((l) => l.reason === 'reward').reduce((a, l) => a - l.delta, 0)
  const ready = cs.filter((c) => c.balance >= cheapest).length
  const near = cs.filter((c) => c.balance < cheapest && cheapest - c.balance <= 2).length
  const save = (id: string, p: Parameters<typeof repos.admin.saveItem>[1]) => void act.run(() => repos.admin.saveItem(id, p))
  const applyAll = () => act.run(async () => { for (const i of rewards) if (i.rewardCost !== ev) await repos.admin.saveItem(i.id, { rewardCost: ev }); return true }, t('a2.cn.applied'))
  return (
    <div className="apane" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      {owner && (
        <div className="kpis">
          <div className="kpi"><small>{t('a2.cn.circulation')}</small><b>{n(inCirculation)}</b><small>{t('a2.cn.holders', { n: n(cs.filter((c) => c.balance > 0).length) })}</small></div>
          <div className="kpi"><small>{t('a2.cn.issued')}</small><b>{n(issued)}</b></div>
          <div className="kpi"><small>{t('a2.cn.redeemed')}</small><b>{n(redeemed)}</b></div>
          <div className="kpi"><small>{t('a2.cn.ready')}</small><b>{n(ready)}</b><small>{t('a2.nearCount', { n: n(near) })}</small></div>
        </div>)}

      <div className="panel">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{t('a2.cn.itemsTitle')}</h3>
          <span className="muted sm" style={{ marginInlineStart: 'auto' }}>{t('a2.cn.itemsHelp')}</span>
        </div>
        <Msg msg={act.msg} />
        <div className="tblw"><table>
          <thead><tr><th>{t('a2.item')}</th><th>{t('admin.rewardEligible')}</th><th>{t('a2.rewardCost')}</th><th>{t('a2.coinsEarned')}</th><th>{t('a2.stock')}</th></tr></thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id} style={i.rewardEligible ? undefined : { opacity: 0.8 }}>
                <td><b>{i.name[lang]}</b> <span className="muted sm">{price(i.price)}</span></td>
                <td><Switch on={i.rewardEligible} label={`${t('admin.rewardEligible')} — ${i.name[lang]}`} disabled={!owner || act.busy} onChange={(v) => save(i.id, { rewardEligible: v })} /></td>
                <td><NumInput value={i.rewardCost} min={1} max={200} label={`${t('a2.rewardCost')} — ${i.name[lang]}`} disabled={!owner || act.busy || !i.rewardEligible} onSave={(v) => save(i.id, { rewardCost: v ?? dflt })} /></td>
                <td><NumInput value={i.coinsEarned} min={0} max={50} label={`${t('a2.coinsEarned')} — ${i.name[lang]}`} disabled={!owner || act.busy} onSave={(v) => save(i.id, { coinsEarned: v ?? 1 })} /></td>
                <td>{i.stock === null ? <span className="muted sm">{t('a2.unlimited')}</span> : i.stock === 0 ? <span className="pillst bad">{t('menu.soldOut')}</span> : n(i.stock)}</td>
              </tr>))}
          </tbody>
        </table></div>
      </div>

      <div className="twocol">
        <div className="panel">
          <h3>{t('a2.cn.defaultTitle')}</h3>
          <p className="muted sm" style={{ margin: 0 }}>{t('a2.cn.defaultHelp')}</p>
          <label className="field">{t('a2.cn.defaultLabel')}
            <input type="number" dir="ltr" min={2} max={50} value={shown} disabled={!owner} onChange={(e) => setEvery(e.target.value)} aria-invalid={!valid} />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn sm" disabled={act.busy || !owner || !valid || ev === dflt} onClick={async () => { if (await act.run(async () => { await repos.admin.saveSettings({ rewardEvery: ev }); return true })) setEvery(null) }}>{t('common.save')}</button>
            <button type="button" className="btn ghost sm" disabled={act.busy || !owner || !valid || rewards.every((i) => i.rewardCost === ev)} onClick={() => void applyAll()}>{t('a2.cn.applyAll', { n: n(ev) })}</button>
          </div>
        </div>
        <div className="panel">
          <h3>{t('a2.cn.howTitle')}</h3>
          <ul className="muted sm" style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 6 }}>
            <li>{t('a2.cn.how1')}</li><li>{t('a2.cn.how2')}</li><li>{t('a2.cn.how3')}</li>
          </ul>
        </div>
      </div>

      {owner && (
        <div className="panel">
          <h3>{t('a2.cn.mugTitle')}</h3>
          <p className="muted sm" style={{ margin: 0 }}>{t('a2.cn.mugHelp')}</p>
          <label className="field">{t('a2.cn.mugLabel')}
            <input type="number" dir="ltr" min={0} max={2147483647} step={1000} value={mugShown} disabled={act.busy} onChange={(e) => setMugDiscount(e.target.value)} aria-invalid={!mugValid} />
          </label>
          <button type="button" className="btn sm" disabled={act.busy || !mugValid || mugValue === mugDflt}
            onClick={async () => { if (await act.run(async () => { await repos.admin.saveSettings({ reusableMugDiscount: mugValue }); return true })) setMugDiscount(null) }}>{t('common.save')}</button>
        </div>)}

      {owner && (
        <div className="panel">
          <h3>{t('a2.customers')}</h3>
          {cs.length === 0 ? <p className="muted">{t('a2.noCustomers')}</p> : (
            <div className="tblw"><table>
              <thead><tr><th>{t('a2.customer')}</th><th>{t('a2.balance')}</th><th>{t('a2.cn.canClaim')}</th><th>{t('a2.ordersCount')}</th><th>{t('admin.adjust')}</th></tr></thead>
              <tbody>{cs.map((c) => {
                const can = rewards.filter((i) => i.rewardCost <= c.balance && (i.stock === null || i.stock > 0) && i.available)
                return (
                  <tr key={c.id}>
                    <td><b>{c.name || '—'}</b><br /><span className="muted sm" dir="ltr">{c.email}</span>{c.phone && <><br /><span className="muted sm" dir="ltr">{c.phone}</span></>}</td>
                    <td><b>{n(c.balance)}</b></td>
                    <td>{can.length ? <span title={can.map((i) => i.name[lang]).join('، ')}>{t('a2.cn.nItems', { n: n(can.length) })}</span> : <span className="muted sm">{t('a2.cn.nextIn', { n: n(Math.max(0, cheapest - c.balance)) })}</span>}</td>
                    <td>{n(c.orders)}</td>
                    <td><Adjust c={c} act={act} /></td>
                  </tr>)
              })}</tbody>
            </table></div>)}
        </div>)}

      {owner && (
        <div className="panel">
          <h3>{t('a2.ledgerAll')}</h3>
          {led.length === 0 ? <p className="muted">{t('a2.noData')}</p> : (
            <div className="tblw"><table><tbody>
              {led.slice(0, 40).map((l) => (
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
