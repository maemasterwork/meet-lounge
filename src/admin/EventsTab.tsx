import { Fragment, useState } from 'react'
import { useI18n } from '../i18n'
import { repos, type Attendee } from '../repos'
import { useRepo } from '../lib/useRepo'
import { Icon } from '../components/icons'
import { dayKey, seatsLeft } from '../data/events'
import { EVENT_ICONS, type CafeEvent, type EventIcon, type EventInput } from '../types'
import { Msg, Switch, useAct } from './common'

const blank = (): EventInput => ({
  icon: 'cup', title: { fa: '', en: '' }, desc: { fa: '', en: '' }, place: { fa: '', en: '' },
  day: dayKey(new Date(Date.now() + 3 * 864e5)), time: '18:00', hours: 2, capacity: 10, held: 0, published: true,
})
const num = (v: string, d: number) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? x : d }

function Form({ initial, id, booked, act, onClose }: { initial: EventInput; id: string | null; booked: number; act: ReturnType<typeof useAct>; onClose: () => void }) {
  const { t } = useI18n()
  const [f, setF] = useState(initial)
  const [cap, setCap] = useState(String(initial.capacity)), [held, setHeld] = useState(String(initial.held)), [hrs, setHrs] = useState(String(initial.hours))
  const c = num(cap, 0), h = num(held, 0), hr = num(hrs, 0)
  const tooSmall = h + booked > c
  const ok = f.title.fa.trim() && f.title.en.trim() && /^\d{4}-\d{2}-\d{2}$/.test(f.day) && /^\d{2}:\d{2}$/.test(f.time) && c >= 1 && c <= 500 && h >= 0 && hr >= 1 && hr <= 12 && !tooSmall
  const pair = (k: 'title' | 'desc' | 'place', lang: 'fa' | 'en', v: string) => setF({ ...f, [k]: { ...f[k], [lang]: v } })
  return (
    <div className="panel">
      <h3>{t(id ? 'ev.edit' : 'ev.new')}</h3>
      <div className="twocol">
        <label className="field">{t('admin.nameFa')}<input value={f.title.fa} maxLength={80} onChange={(e) => pair('title', 'fa', e.target.value)} /></label>
        <label className="field">{t('admin.nameEn')}<input dir="ltr" value={f.title.en} maxLength={80} onChange={(e) => pair('title', 'en', e.target.value)} /></label>
        <label className="field">{t('a2.descFa')}<textarea rows={2} value={f.desc.fa} maxLength={400} onChange={(e) => pair('desc', 'fa', e.target.value)} /></label>
        <label className="field">{t('a2.descEn')}<textarea dir="ltr" rows={2} value={f.desc.en} maxLength={400} onChange={(e) => pair('desc', 'en', e.target.value)} /></label>
        <label className="field">{t('ev.placeFa')}<input value={f.place.fa} maxLength={80} onChange={(e) => pair('place', 'fa', e.target.value)} /></label>
        <label className="field">{t('ev.placeEn')}<input dir="ltr" value={f.place.en} maxLength={80} onChange={(e) => pair('place', 'en', e.target.value)} /></label>
        <label className="field">{t('ev.date')}<input type="date" dir="ltr" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></label>
        <label className="field">{t('ev.time')}<input type="time" dir="ltr" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
        <label className="field">{t('ev.hours')}<input type="number" dir="ltr" min={1} max={12} value={hrs} onChange={(e) => setHrs(e.target.value)} /></label>
        <label className="field">{t('ev.capacity')}<input type="number" dir="ltr" min={1} max={500} value={cap} onChange={(e) => setCap(e.target.value)} /></label>
        <label className="field">{t('ev.held')}<input type="number" dir="ltr" min={0} max={500} value={held} onChange={(e) => setHeld(e.target.value)} /><small className="muted">{t('ev.heldHelp')}</small></label>
        <div className="field"><span>{t('ev.icon')}</span>
          <div className="iconpick" role="radiogroup" aria-label={t('ev.icon')}>
            {EVENT_ICONS.map((k: EventIcon) => <button key={k} type="button" role="radio" aria-checked={f.icon === k} aria-label={k} className={f.icon === k ? 'on' : ''} onClick={() => setF({ ...f, icon: k })}><Icon name={k} size={20} /></button>)}
          </div>
        </div>
      </div>
      {tooSmall && <p className="err sm" role="alert">{t('ev.tooSmall', { n: String(booked) })}</p>}
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="row" style={{ gap: 8 }}><Switch on={f.published} label={t('ev.published')} disabled={false} onChange={(v) => setF({ ...f, published: v })} />{t('ev.published')}</label>
        <button type="button" className="btn sm" disabled={act.busy || !ok} onClick={async () => {
          const saved = await act.run(() => repos.admin.saveEvent(id, { ...f, title: { fa: f.title.fa.trim(), en: f.title.en.trim() }, desc: { fa: f.desc.fa.trim(), en: f.desc.en.trim() }, place: { fa: f.place.fa.trim(), en: f.place.en.trim() }, capacity: c, held: h, hours: hr }))
          if (saved) onClose()
        }}>{t('common.save')}</button>
        <button type="button" className="btn ghost sm" onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </div>)
}

function Guests({ id }: { id: string }) {
  const { t, lang } = useI18n()
  const g = useRepo<Attendee[]>(() => repos.admin.attendees(id), [repos.admin])
  if (g.loading) return <span className="muted sm">…</span>
  if (!g.data?.length) return <span className="muted sm">{t('ev.noGuests')}</span>
  return <ul className="guests">{g.data.map((a, i) => <li key={i}><b>{a.name || '—'}</b>{a.phone && <span dir="ltr" className="muted sm"> {a.phone}</span>} <span className="muted sm">{new Date(a.at).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB')}</span></li>)}</ul>
}

export function EventsTab({ owner }: { owner: boolean }) {
  const { t, n, lang } = useI18n()
  const events = useRepo(() => repos.admin.events(), [repos.admin])
  const act = useAct()
  const [form, setForm] = useState<{ id: string | null; init: EventInput; booked: number } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [past, setPast] = useState(false)
  const today = dayKey(new Date())
  const all = events.data ?? []
  const list = all.filter((e) => past || e.day >= today)
  const dis = act.busy || !owner
  const edit = (e: CafeEvent) => setForm({ id: e.id, init: { icon: e.icon, title: e.title, desc: e.desc, place: e.place, day: e.day, time: e.time, hours: e.hours, capacity: e.capacity, held: e.held, published: e.published }, booked: e.booked })
  const fmt = (e: CafeEvent) => new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(e.day + 'T12:00:00'))
  return (
    <div className="apane" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      {owner && form && <Form key={form.id ?? 'new'} initial={form.init} id={form.id} booked={form.booked} act={act} onClose={() => setForm(null)} />}
      <div className="panel">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{t('ev.title')}</h3>
          <label className="row" style={{ gap: 8, marginInlineStart: 'auto' }}><input type="checkbox" checked={past} onChange={(e) => setPast(e.target.checked)} />{t('ev.showPast')}</label>
          {owner && <button type="button" className="btn sm" onClick={() => setForm({ id: null, init: blank(), booked: 0 })}>{t('ev.new')}</button>}
        </div>
        <Msg msg={act.msg} />
        {!owner && <p className="muted sm" style={{ margin: 0 }}>{t('a2.ownerOnly')}</p>}
        {events.error && <p className="err" role="alert">{t('err.generic')}</p>}
        {list.length === 0 ? <p className="muted">{t('ev.empty')}</p> : (
          <div className="tblw"><table>
            <thead><tr><th>{t('ev.when')}</th><th>{t('ev.what')}</th><th>{t('ev.seats')}</th><th>{t('ev.published')}</th><th /></tr></thead>
            <tbody>{list.map((e) => (
              <Fragment key={e.id}>
                <tr style={e.day < today ? { opacity: 0.55 } : undefined}>
                  <td style={{ whiteSpace: 'nowrap' }}><b>{fmt(e)}</b><br /><span className="muted sm">{e.time.replace(/\d/g, (d) => n(+d))}</span></td>
                  <td><div className="row" style={{ gap: 8, alignItems: 'center' }}><Icon name={e.icon} size={22} /><span><b>{e.title[lang]}</b>{e.place[lang] && <><br /><span className="muted sm">{e.place[lang]}</span></>}</span></div></td>
                  <td>
                    <b>{n(e.booked)}</b> <span className="muted sm">+ {n(e.held)} {t('ev.heldShort')} / {n(e.capacity)}</span>
                    <br />{seatsLeft(e) === 0 ? <span className="pillst bad">{t('events.full')}</span> : <span className="muted sm">{t('ev.left', { n: n(seatsLeft(e)) })}</span>}
                  </td>
                  <td><Switch on={e.published} label={t('ev.published')} disabled={dis} onChange={(v) => void act.run(() => repos.admin.saveEvent(e.id, { icon: e.icon, title: e.title, desc: e.desc, place: e.place, day: e.day, time: e.time, hours: e.hours, capacity: e.capacity, held: e.held, published: v }))} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn ghost sm" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>{t('ev.guests')}</button>{' '}
                    {owner && <button type="button" className="btn ghost sm" disabled={act.busy} onClick={() => edit(e)}>{t('common.edit')}</button>}{' '}
                    {owner && (confirm === e.id
                      ? <><button type="button" className="btn sm danger" disabled={act.busy} onClick={async () => { await act.run(() => repos.admin.deleteEvent(e.id)); setConfirm(null) }}>{t('ev.confirmDelete')}</button> <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>{t('common.cancel')}</button></>
                      : <button type="button" className="btn ghost sm" disabled={act.busy} onClick={() => setConfirm(e.id)}>{t('ev.delete')}</button>)}
                  </td>
                </tr>
                {open === e.id && <tr key={`${e.id}-g`}><td colSpan={5}><Guests id={e.id} /></td></tr>}
              </Fragment>))}</tbody>
          </table></div>)}
      </div>
    </div>)
}
