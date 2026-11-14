import type { CafeEvent } from '../types'

export type CalKind = 'gregory' | 'persian'

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** The event's day as a local Date at noon (safe from daylight-saving edges). */
export const eventDate = (e: Pick<CafeEvent, 'day'>) => { const [y, m, d] = e.day.split('-').map(Number); return new Date(y, m - 1, d, 12) }

/** Seats a customer can still save: capacity minus the cafe's held seats and everyone's booked seats. */
export const seatsLeft = (e: Pick<CafeEvent, 'capacity' | 'held' | 'booked'>) => Math.max(0, e.capacity - e.held - e.booked)

/** Events grouped by day (YYYY-MM-DD), each day sorted by start time. */
export function byDay(list: CafeEvent[]): Map<string, CafeEvent[]> {
  const m = new Map<string, CafeEvent[]>()
  for (const e of [...list].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time))) m.set(e.day, [...(m.get(e.day) ?? []), e])
  return m
}
/** The first event on or after `from` (a Date), or null. */
export const nextEvent = (list: CafeEvent[], from: Date): CafeEvent | null => byDay(list.filter((e) => e.day >= dayKey(from))).values().next().value?.[0] ?? null

/* ---- calendar math: Gregorian or Persian (Jalali) month grids ---- */
const partsFmt: Record<CalKind, Intl.DateTimeFormat> = {
  gregory: new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }),
  persian: new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }),
}
export function calParts(d: Date, cal: CalKind): { y: number; m: number; d: number } {
  const p = Object.fromEntries(partsFmt[cal].formatToParts(d).filter((x) => x.type !== 'literal' && x.type !== 'era').map((x) => [x.type, parseInt(x.value, 10)]))
  return { y: p.year, m: p.month, d: p.day }
}
const addDays = (d: Date, k: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k, 12)

export interface MonthGrid { first: Date; len: number; y: number; m: number; cells: { date: Date; day: number; inMonth: boolean }[] }
export function monthOf(any: Date, cal: CalKind): MonthGrid {
  const p = calParts(any, cal)
  const first = addDays(any, 1 - p.d)
  let len = p.d
  while (calParts(addDays(first, len), cal).m === p.m) len++
  const weekStart = cal === 'persian' ? 6 : 1                          // Saturday for Iran, Monday for the reference
  const lead = (first.getDay() - weekStart + 7) % 7
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = addDays(first, i - lead), cp = calParts(date, cal)
    return { date, day: cp.d, inMonth: cp.m === p.m && cp.y === p.y }
  })
  return { first, len, y: p.y, m: p.m, cells }
}
export const shiftMonth = (g: MonthGrid, dir: 1 | -1, cal: CalKind) => monthOf(dir === 1 ? addDays(g.first, g.len) : addDays(g.first, -1), cal)
export const weekdayOrder = (cal: CalKind): number[] => (cal === 'persian' ? [6, 0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 0])
