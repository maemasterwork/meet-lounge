import { useState } from 'react'
import { useI18n } from '../i18n'
import { repos } from '../repos'
import { useRepo } from '../lib/useRepo'
import { Msg, useAct } from './common'

const AUD = [['all', 'admin.audAll'], ['repeat', 'admin.audRepeat'], ['near_reward', 'admin.audNear']] as const
const TEMPLATES = [
  { title: 'admin.tmplMorning', body: 'admin.tmplMorningBody', item: 'latte', pct: 15 },
  { title: 'admin.tmplReward', body: 'admin.tmplRewardBody', item: 'cheesecake', pct: 0 },
  { title: 'admin.tmplAfternoon', body: 'admin.tmplAfternoonBody', item: 'croissant', pct: 50 },
]

export function OffersTab({ owner }: { owner: boolean }) {
  const { t, n, lang } = useI18n()
  const items = useRepo(() => repos.admin.items(), [repos.admin])
  const offers = useRepo(() => repos.admin.offers(), [repos.admin])
  const act = useAct()
  const blank = { titleFa: '', titleEn: '', bodyFa: '', bodyEn: '', item: 'latte', pct: '0', aud: 'all', ends: '' }
  const [f, setF] = useState(blank)
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const pct = Math.round(Number(f.pct))
  const ok = f.titleFa.trim() && f.bodyFa.trim() && f.item && Number.isFinite(pct) && pct >= 0 && pct <= 90
  const nameOf = (id: string) => items.data?.find((i) => i.id === id)?.name[lang] ?? id
  const fromTemplate = (tp: (typeof TEMPLATES)[number]) => {
    setF({ ...f, titleFa: lang === 'fa' ? t(tp.title) : f.titleFa, titleEn: lang === 'en' ? t(tp.title) : f.titleEn, bodyFa: lang === 'fa' ? t(tp.body) : f.bodyFa, bodyEn: lang === 'en' ? t(tp.body) : f.bodyEn, item: items.data?.some((i) => i.id === tp.item) ? tp.item : f.item, pct: String(tp.pct) })
  }
  return (
    <div className="apane" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div className="twocol">
        <div className="panel">
          <h3>{t('admin.offerCompose')}</h3>
          <div className="chips">{TEMPLATES.map((tp) => <button key={tp.title} type="button" className="pill" onClick={() => fromTemplate(tp)}>{t(tp.title)}</button>)}</div>
          <label className="field">{t('admin.offerTitle')} ({t('admin.nameFa')})<input value={f.titleFa} maxLength={80} onChange={set('titleFa')} /></label>
          <label className="field">{t('admin.offerTitle')} ({t('admin.nameEn')})<input dir="ltr" value={f.titleEn} maxLength={80} onChange={set('titleEn')} /></label>
          <label className="field">{t('admin.offerBody')} ({t('admin.nameFa')})<textarea rows={2} value={f.bodyFa} maxLength={240} onChange={set('bodyFa')} /></label>
          <label className="field">{t('admin.offerBody')} ({t('admin.nameEn')})<textarea dir="ltr" rows={2} value={f.bodyEn} maxLength={240} onChange={set('bodyEn')} /></label>
          <div className="twocol">
            <label className="field">{t('admin.offerItem')}<select value={f.item} onChange={set('item')}>{(items.data ?? []).filter((i) => !i.archived).map((i) => <option key={i.id} value={i.id}>{i.name[lang]}</option>)}</select></label>
            <label className="field">{t('a2.pct')}<input type="number" dir="ltr" min={0} max={90} value={f.pct} onChange={set('pct')} /></label>
            <label className="field">{t('admin.offerAudience')}<select value={f.aud} onChange={set('aud')}>{AUD.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></label>
            <label className="field">{t('a2.offerEnds')}<input type="date" dir="ltr" value={f.ends} onChange={set('ends')} /></label>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <button type="button" className="btn sm" disabled={act.busy || !owner || !ok} onClick={async () => {
              const r = await act.run(async () => { await repos.admin.addOffer({ title: { fa: f.titleFa.trim(), en: f.titleEn.trim() }, body: { fa: f.bodyFa.trim(), en: f.bodyEn.trim() }, itemId: f.item, pct, audience: f.aud, endsAt: f.ends ? new Date(`${f.ends}T23:59:59`).toISOString() : undefined }); return true }, t('admin.offerSent'))
              if (r) setF(blank)
            }}>{t('admin.offerSend')}</button>
            {!owner && <span className="muted sm">{t('a2.ownerOnly')}</span>}
          </div>
          <Msg msg={act.msg} />
        </div>
        <div className="panel">
          <h3>{t('admin.offerPreview')}</h3>
          <div className="notif"><small>{t('brand.name')}</small><b>{(lang === 'fa' ? f.titleFa : f.titleEn || f.titleFa) || '…'}</b><span>{(lang === 'fa' ? f.bodyFa : f.bodyEn || f.bodyFa) || '…'}</span>
            <small>{nameOf(f.item)}{pct > 0 ? ` · ${n(pct)}٪` : ''}</small></div>
        </div>
      </div>
      <div className="panel">
        <h3>{t('admin.offerActive')}</h3>
        {(offers.data ?? []).length === 0 ? <p className="muted">{t('a2.noOffers')}</p> : (
          <div className="tblw"><table><tbody>
            {(offers.data ?? []).map((o) => (
              <tr key={o.id} style={o.active ? undefined : { opacity: 0.55 }}>
                <td><b>{o.title[lang]}</b><br /><span className="muted sm">{nameOf(o.itemId)}{o.pct ? ` · ${n(o.pct)}٪` : ''}</span></td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'end' }}>
                  <button type="button" className="btn ghost sm" disabled={act.busy || !owner} onClick={() => void act.run(() => repos.admin.setOfferActive(o.id, !o.active))}>{t(o.active ? 'a2.deactivate' : 'a2.activate')}</button>{' '}
                  <button type="button" className="btn ghost sm" disabled={act.busy || !owner} onClick={() => void act.run(() => repos.admin.deleteOffer(o.id))}>{t('common.delete')}</button>
                </td>
              </tr>))}
          </tbody></table></div>)}
      </div>
    </div>)
}
