import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useUi } from '../store/ui'
import { go } from '../lib/route'
import { Icon } from '../components/icons'
import { SceneArt } from '../art/ItemArt'
import { timeKey } from '../data/catalog'
import { byDay, calParts, dayKey, eventDate, monthOf, nextEvent, seatsLeft, shiftMonth, weekdayOrder, type CalKind } from '../data/events'
import { repos } from '../repos'
import { useRepo } from '../lib/useRepo'
import type { CafeEvent } from '../types'

const EV_ERR: Record<string, string> = { 'event-full': 'events.errFull', 'event-closed': 'events.errClosed', 'event-not-found': 'events.errGone' }

export function EventsPage() {
  const { t, n, lang } = useI18n()
  const toast = useUi((s) => s.toast)
  const events = useRepo(() => repos.events.list(), [repos.events])
  const mine = useRepo(() => repos.events.mine(), [repos.events])
  const [busy, setBusy] = useState<string | null>(null)
  const cal: CalKind = lang === 'fa' ? 'persian' : 'gregory'
  const today = useMemo(() => new Date(), [])
  const days = useMemo(() => byDay(events.data ?? []), [events.data])
  const first = useMemo(() => nextEvent(events.data ?? [], today), [events.data, today])
  const [pick, setPick] = useState<Date | null>(null)                       // the day the customer chose; until then the next event's day
  const [cursor, setCursor] = useState<Date | null>(null)
  const sel = pick ?? (first ? eventDate(first) : today)
  const grid = useMemo(() => monthOf(cursor ?? sel, cal), [cursor, sel, cal])
  const loc = lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-GB'
  const monthName = (d: Date) => new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', { month: 'long' }).format(d)
  const wd = (d: Date, w: 'short' | 'long') => new Intl.DateTimeFormat(loc, { weekday: w }).format(d)
  const dayEvents = days.get(dayKey(sel)) ?? []
  const clk = (s: string) => s.replace(/\d/g, (d) => n(+d))
  const step = (dir: 1 | -1) => setCursor(shiftMonth(grid, dir, cal).first)
  const heads = weekdayOrder(cal).map((w) => new Date(2026, 9, 4 + w, 12))        // 4 Oct 2026 is a Sunday
  const todayKey = dayKey(today), selKey = dayKey(sel)
  const toggle = async (e: CafeEvent, on: boolean) => {
    setBusy(e.id)
    try { if (on) await repos.events.cancel(e.id); else await repos.events.book(e.id); toast(t(on ? 'events.toastOff' : 'events.toastOn')) }
    catch (err) { toast(t(EV_ERR[(err as { code?: string }).code ?? ''] ?? 'err.generic')) }
    finally { setBusy(null); mine.reload() }
  }
  const mineSet = new Set(mine.data ?? [])

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
            const list = c.inMonth ? days.get(dayKey(c.date)) : undefined, e = list?.[0], k = dayKey(c.date)
            const cls = ['cd', c.inMonth ? '' : 'out', e ? 'ev' : '', k === selKey ? 'sel' : '', k === todayKey ? 'today' : ''].filter(Boolean).join(' ')
            return (
              <button key={i} type="button" className={cls} disabled={!c.inMonth} aria-pressed={k === selKey} aria-current={k === todayKey ? 'date' : undefined}
                aria-label={`${n(c.day)} ${monthName(c.date)}${e ? ' · ' + e.title[lang] : ''}`} onClick={() => setPick(c.date)}>
                <b>{n(c.day)}</b>
                {e && <><Icon name={e.icon} size={22} /><span className="et">{e.title[lang]}</span>{list!.length > 1 && <i className="more">+{n(list!.length - 1)}</i>}</>}
              </button>)
          })}
        </div>
        <p className="cfoot">{t('events.foot')}</p>
      </article>

      <aside className="evr">
        <h3 className="caps onday"><Icon name="leaf" size={14} />{t('events.onTheDay')}</h3>
        {dayEvents.length ? (
          <div className="tickets">
            {dayEvents.map((ev) => {
              const on = mineSet.has(ev.id), left = seatsLeft(ev), past = ev.day < todayKey
              return (
                <article key={ev.id} className="ticket ltr" data-testid="event-ticket">
                  <div className="stub"><small>{wd(eventDate(ev), 'short')}</small><b>{n(calParts(eventDate(ev), cal).d)}</b><small>{monthName(eventDate(ev))}</small></div>
                  <div className="tbody">
                    <Icon name={ev.icon} size={34} className="tic" />
                    <h4 className="script">{ev.title[lang]}</h4>
                    <p className="caps sm">{clk(ev.time)} · {n(ev.hours)} {t('events.hours')}{ev.place[lang] ? ` · ${ev.place[lang]}` : ''}</p>
                    {ev.desc[lang] && <p className="td">{ev.desc[lang]}</p>}
                    <div className="tf"><span className="seats">{left === 0 && !on ? t('events.full') : t('events.seatsOf', { n: n(left), total: n(ev.capacity - ev.held) })}</span>
                      {!past && <button type="button" className={`btn seat${on ? ' ghost' : ''}`} aria-pressed={on} disabled={busy === ev.id || (left === 0 && !on)} onClick={() => void toggle(ev, on)}>{t(on ? 'events.registered' : 'events.saveSeat')}</button>}</div>
                  </div>
                </article>)
            })}
          </div>
        ) : (
          <article className="ticket ltr empty"><div className="tbody"><p className="muted">{t(events.error ? 'err.generic' : 'events.none')}</p>
            {first && <button type="button" className="btn sm" onClick={() => { setPick(eventDate(first)); setCursor(null) }}>{t('events.jumpNext')}</button>}</div></article>)}
        <div className="evart" aria-hidden="true"><SceneArt kind="mini" time={timeKey()} /></div>
        <button type="button" className="back ltr evback" onClick={() => go('home')}><Icon name="arrowL" size={16} /><span>{t('nav.back')}</span></button>
      </aside>
    </div>
  )
}
