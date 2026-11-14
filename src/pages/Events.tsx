import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useUi } from '../store/ui'
import { go } from '../lib/route'
import { Icon } from '../components/icons'
import { SceneArt } from '../art/ItemArt'
import { timeKey } from '../data/catalog'
import { calParts, dayKey, eventOn, monthOf, nextEvent, seatsLeft, shiftMonth, weekdayOrder, type CafeEvent, type CalKind } from '../data/events'

export function EventsPage() {
  const { t, n, lang } = useI18n()
  const registered = useUi((s) => s.registered)
  const toggle = useUi((s) => s.toggleRegistered)
  const toast = useUi((s) => s.toast)
  const cal: CalKind = lang === 'fa' ? 'persian' : 'gregory'
  const today = useMemo(() => new Date(), [])
  const first = useMemo(() => nextEvent(today)?.date ?? today, [today])
  const [sel, setSel] = useState<Date>(first)
  const [cursor, setCursor] = useState<Date>(first)
  const grid = useMemo(() => monthOf(cursor, cal), [cursor, cal])
  const loc = lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-GB'
  const monthName = (d: Date) => new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', { month: 'long' }).format(d)
  const wd = (d: Date, w: 'short' | 'long') => new Intl.DateTimeFormat(loc, { weekday: w }).format(d)
  const ev = eventOn(sel)
  const on = ev ? registered.includes(ev.key) : false
  const clk = (s: string) => s.replace(/\d/g, (d) => n(+d))
  const step = (dir: 1 | -1) => setCursor(shiftMonth(grid, dir, cal).first)
  const heads = weekdayOrder(cal).map((w) => new Date(2026, 9, 4 + w, 12))        // 4 Oct 2026 is a Sunday
  const todayKey = dayKey(today), selKey = dayKey(sel)
  const cellEv = (d: Date): CafeEvent | null => eventOn(d)

  return (
    <div className="evp ltr">
      <article className="card calc" aria-label={t('events.title')}>
        <i className="tape pink" aria-hidden="true" /><i className="tape teal" aria-hidden="true" />
        <div className="chd ltr">
          <button type="button" className="cnav" onClick={() => step(-1)} aria-label={t('events.prev')}><Icon name="chevL" size={16} /></button>
          <h2 className="script mon" aria-live="polite">{monthName(grid.first)}<small>{n(grid.y).replace(/[٬,]/g, '')}</small></h2>
          <button type="button" className="cnav" onClick={() => step(1)} aria-label={t('events.next')}><Icon name="chevR" size={16} /></button>
          <span className="caps tl">{t('events.gatherings')}</span>
        </div>
        <div className="wk" aria-hidden="true">{heads.map((h, i) => <span key={i} className={cal === 'gregory' && (h.getDay() === 6 || h.getDay() === 0) ? 'we' : cal === 'persian' && h.getDay() === 5 ? 'we' : ''}>{wd(h, 'short')}</span>)}</div>
        <div className="cg" role="grid">
          {grid.cells.map((c, i) => {
            const e = c.inMonth ? cellEv(c.date) : null, k = dayKey(c.date)
            const cls = ['cd', c.inMonth ? '' : 'out', e ? 'ev' : '', k === selKey ? 'sel' : '', k === todayKey ? 'today' : ''].filter(Boolean).join(' ')
            return (
              <button key={i} type="button" className={cls} disabled={!c.inMonth} aria-pressed={k === selKey} aria-current={k === todayKey ? 'date' : undefined}
                aria-label={`${n(c.day)} ${monthName(c.date)}${e ? ' · ' + e.title[lang] : ''}`} onClick={() => setSel(c.date)}>
                <b>{n(c.day)}</b>
                {e && <><Icon name={e.icon} size={22} /><span className="et">{e.title[lang]}</span></>}
              </button>)
          })}
        </div>
        <p className="cfoot">{t('events.foot')}</p>
      </article>

      <aside className="evr">
        <h3 className="caps onday"><Icon name="leaf" size={14} />{t('events.onTheDay')}</h3>
        {ev ? (
          <article className="ticket ltr" data-testid="event-ticket">
            <div className="stub"><small>{wd(ev.date, 'short')}</small><b>{n(calParts(ev.date, cal).d)}</b><small>{monthName(ev.date)}</small></div>
            <div className="tbody">
              <Icon name={ev.icon} size={34} className="tic" />
              <h4 className="script">{ev.title[lang]}</h4>
              <p className="caps sm">{clk(ev.time)} · {n(ev.hours)} {t('events.hours')} · {ev.place[lang]}</p>
              <p className="td">{ev.desc[lang]}</p>
              <div className="tf"><span className="seats">{t('events.seatsOf', { n: n(seatsLeft(ev, on)), total: n(ev.capacity) })}</span>
                <button type="button" className={`btn seat${on ? ' ghost' : ''}`} aria-pressed={on} onClick={() => { toggle(ev.key); toast(t(on ? 'events.toastOff' : 'events.toastOn')) }}>{t(on ? 'events.registered' : 'events.saveSeat')}</button></div>
            </div>
          </article>
        ) : (
          <article className="ticket ltr empty"><div className="tbody"><p className="muted">{t('events.none')}</p>
            <button type="button" className="btn sm" onClick={() => { const e = nextEvent(sel); if (e) { setSel(e.date); setCursor(e.date) } }}>{t('events.jumpNext')}</button></div></article>)}
        <div className="evart" aria-hidden="true"><SceneArt kind="mini" time={timeKey()} /></div>
        <button type="button" className="back ltr evback" onClick={() => go('home')}><Icon name="arrowL" size={16} /><span>{t('nav.back')}</span></button>
      </aside>
    </div>
  )
}
