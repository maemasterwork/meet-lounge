import { describe, expect, it } from 'vitest'
import { byDay, dayKey, eventDate, monthOf, nextEvent, seatsLeft, shiftMonth, weekdayOrder } from './events'
import type { CafeEvent } from '../types'

const ev = (o: Partial<CafeEvent>): CafeEvent => ({ id: 'a', icon: 'cup', title: { en: 'A', fa: 'الف' }, desc: { en: '', fa: '' }, place: { en: '', fa: '' }, day: '2026-10-14', time: '18:00', hours: 2, capacity: 10, held: 2, booked: 3, published: true, ...o })

describe('events calendar', () => {
  it('builds October 2026 like the reference: Monday first, 42 cells', () => {
    const g = monthOf(new Date(2026, 9, 14, 12), 'gregory')
    expect(g.len).toBe(31); expect(g.cells.length).toBe(42)
    expect(weekdayOrder('gregory')[0]).toBe(1)
    expect(g.cells[0].date.getDate()).toBe(28); expect(g.cells[0].inMonth).toBe(false)   // Oct 1 is a Thursday
    expect(g.cells[3].day).toBe(1)
  })
  it('navigates months both ways, including the Persian calendar', () => {
    const g = monthOf(new Date(2026, 9, 14, 12), 'gregory')
    expect(shiftMonth(g, 1, 'gregory').m).toBe(11); expect(shiftMonth(g, -1, 'gregory').m).toBe(9)
    const p = monthOf(new Date(2026, 10, 14, 12), 'persian')            // 23 Aban 1405
    expect(p.m).toBe(8); expect([29, 30, 31]).toContain(p.len)
    expect(shiftMonth(p, 1, 'persian').m).toBe(9); expect(shiftMonth(p, -1, 'persian').m).toBe(7)
    expect(weekdayOrder('persian')[0]).toBe(6)
  })
})

describe('events data helpers', () => {
  it('seats left = capacity - held - booked, never negative', () => {
    expect(seatsLeft(ev({}))).toBe(5)
    expect(seatsLeft(ev({ capacity: 3, held: 2, booked: 2 }))).toBe(0)
  })
  it('groups by day, sorted by start time', () => {
    const m = byDay([ev({ id: 'b', time: '19:00' }), ev({ id: 'a', time: '10:00' }), ev({ id: 'c', day: '2026-10-15' })])
    expect(m.get('2026-10-14')!.map((e) => e.id)).toEqual(['a', 'b']); expect(m.size).toBe(2)
  })
  it('finds the next event from a date, including that day', () => {
    const l = [ev({ id: 'x', day: '2026-10-10' }), ev({ id: 'y', day: '2026-10-14' }), ev({ id: 'z', day: '2026-10-20' })]
    expect(nextEvent(l, new Date(2026, 9, 14, 9))!.id).toBe('y'); expect(nextEvent(l, new Date(2026, 9, 21))).toBeNull()
  })
  it('turns an event day into a local date', () => {
    expect(dayKey(eventDate(ev({ day: '2026-12-31' })))).toBe('2026-12-31')
  })
})
