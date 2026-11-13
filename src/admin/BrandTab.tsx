import { useState } from 'react'
import { useI18n } from '../i18n'
import { repos } from '../repos'
import { useRepo } from '../lib/useRepo'
import { QrSheet } from './QrSheet'
import { IMAGE_ACCEPT, Msg, Switch, contrast, useAct } from './common'

const ok = async (fn: () => Promise<void>) => { await fn(); return true }

export function BrandTab({ owner }: { owner: boolean }) {
  const { t } = useI18n()
  const st = useRepo(() => repos.settings.get(), [repos.settings])
  const act = useAct()
  const [d, setD] = useState<Record<string, string>>({})
  const s = st.data
  if (!s) return <div className="apane"><p className="muted">{t('loading')}</p></div>
  const val = (k: string, cur: string | number | undefined) => d[k] ?? String(cur ?? '')
  const accent = val('accent', s.accent || '#a9481f'), gold = val('gold', s.gold || '#e3a72f')
  const weak = contrast(accent, '#ffffff') < 4.5
  const dis = act.busy || !owner
  const clear = (...ks: string[]) => setD((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !ks.includes(k))))
  const fee = Math.round(Number(val('fee', s.deliveryFee))), tables = Math.round(Number(val('tables', s.tableCount)))
  return (
    <div className="apane" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <Msg msg={act.msg} />
      {!owner && <p className="muted sm" style={{ margin: 0 }}>{t('a2.ownerOnly')}</p>}
      <div className="twocol">
        <div className="panel">
          <h3>{t('admin.brandTitle')}</h3>
          <label className="field">{t('admin.nameFa')}<input value={val('nfa', s.brand.fa)} maxLength={40} disabled={dis} onChange={(e) => setD({ ...d, nfa: e.target.value })} /></label>
          <label className="field">{t('admin.nameEn')}<input dir="ltr" value={val('nen', s.brand.en)} maxLength={40} disabled={dis} onChange={(e) => setD({ ...d, nen: e.target.value })} /></label>
          <button type="button" className="btn sm" style={{ alignSelf: 'start' }} disabled={dis || !val('nfa', s.brand.fa).trim() || !val('nen', s.brand.en).trim()}
            onClick={async () => { if (await act.run(() => ok(() => repos.admin.saveSettings({ brand: { fa: val('nfa', s.brand.fa).trim(), en: val('nen', s.brand.en).trim() } })))) clear('nfa', 'nen') }}>{t('common.save')}</button>
          <label className="field">{t('admin.heroImage')}
            <input type="file" accept={IMAGE_ACCEPT} disabled={dis} onChange={(e) => { const f = e.target.files?.[0]; if (f) void act.run(() => ok(() => repos.admin.setHero(f))); e.target.value = '' }} />
          </label>
          {s.heroUrl && <button type="button" className="btn ghost sm" style={{ alignSelf: 'start' }} disabled={dis} onClick={() => void act.run(() => ok(() => repos.admin.setHero(null)))}>{t('admin.removeHero')}</button>}
        </div>
        <div className="panel">
          <h3>{t('a2.brandColors')}</h3>
          <label className="swatch">{t('admin.colorAccent')}<input type="color" value={accent} disabled={dis} onChange={(e) => setD({ ...d, accent: e.target.value })} /></label>
          {weak && <p className="err" role="alert" style={{ margin: 0 }}>{t('admin.contrastWarn')}</p>}
          <label className="swatch">{t('admin.colorGold')}<input type="color" value={gold} disabled={dis} onChange={(e) => setD({ ...d, gold: e.target.value })} /></label>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn sm" disabled={dis || weak || (!d.accent && !d.gold)} onClick={async () => { if (await act.run(() => ok(() => repos.admin.saveSettings({ accent, gold })))) clear('accent', 'gold') }}>{t('common.save')}</button>
            <button type="button" className="btn ghost sm" disabled={dis || (!s.accent && !s.gold)} onClick={async () => { if (await act.run(() => ok(() => repos.admin.saveSettings({ accent: undefined, gold: undefined })))) clear('accent', 'gold') }}>{t('a2.reset')}</button>
          </div>
        </div>
      </div>
      <div className="twocol">
        <div className="panel">
          <h3>{t('admin.shopOpen')}</h3>
          <div className="row" style={{ gap: 12, alignItems: 'center' }}><Switch on={s.shopOpen} label={t('admin.shopOpen')} disabled={dis} onChange={(v) => void act.run(() => ok(() => repos.admin.saveSettings({ shopOpen: v })))} />{!s.shopOpen && <span className="muted sm">{t('a2.shopClosedNote')}</span>}</div>
        </div>
        <div className="panel">
          <label className="field">{t('admin.deliveryFee')}<input type="number" dir="ltr" min={0} step={1000} value={val('fee', s.deliveryFee)} disabled={dis} onChange={(e) => setD({ ...d, fee: e.target.value })} /><span className="muted sm">{t('a2.deliveryHelp')}</span></label>
          <label className="field">{t('admin.tables')}<input type="number" dir="ltr" min={1} max={200} value={val('tables', s.tableCount)} disabled={dis} onChange={(e) => setD({ ...d, tables: e.target.value })} /><span className="muted sm">{t('a2.tablesHelp')}</span></label>
          <button type="button" className="btn sm" style={{ alignSelf: 'start' }} disabled={dis || !(Number.isFinite(fee) && fee >= 0) || !(tables >= 1 && tables <= 200) || (fee === s.deliveryFee && tables === s.tableCount)}
            onClick={async () => { if (await act.run(() => ok(() => repos.admin.saveSettings({ deliveryFee: fee, tableCount: tables })))) clear('fee', 'tables') }}>{t('common.save')}</button>
        </div>
      </div>
      <QrSheet tables={s.tableCount} />
    </div>)
}
