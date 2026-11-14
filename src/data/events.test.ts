import { describe, expect, it } from 'vitest'
import { eventOn, monthOf, nextEvent, seatsLeft, shiftMonth, weekdayOrder } from './events'

describe('events calendar', () => {
  it('builds October 2026 like the reference: Monday first, 42 cells', () => {
    const g = monthOf(new Date(2026, 9, 14, 12), 'gregory')
    expect(g.len).toBe(31); expect(g.cells.length).toBe(42)
    expect(weekdayOrder('gregory')[0]).toBe(1)
    expect(g.cells[0].date.getDate()).toBe(28); expect(g.cells[0].inMonth).toBe(false)   // Oct 1 is a Thursday
    expect(g.cells[3].day).toBe(1)
  })
  it('recurring events land on the expected days', () => {
    expect(eventOn(new Date(2026, 9, 14, 12))?.id).toBe('cake')       // 2nd Wednesday
    expect(eventOn(new Date(2026, 9, 3, 12))?.id).toBe('acoustic')    // 1st Saturday
    expect(eventOn(new Date(2026, 9, 15, 12))).toBeNull()
  })
  it('navigates months both ways, including the Persian calendar', () => {
    const g = monthOf(new Date(2026, 9, 14, 12), 'gregory')
    expect(shiftMonth(g, 1, 'gregory').m).toBe(11); expect(shiftMonth(g, -1, 'gregory').m).toBe(9)
    const p = monthOf(new Date(2026, 10, 14, 12), 'persian')            // 23 Aban 1405
    expect(p.m).toBe(8); expect([29, 30, 31]).toContain(p.len)
    expect(shiftMonth(p, 1, 'persian').m).toBe(9); expect(shiftMonth(p, -1, 'persian').m).toBe(7)
    expect(weekdayOrder('persian')[0]).toBe(6)
  })
  it('always finds an upcoming event with seats left', () => {
    const e = nextEvent(new Date(2026, 10, 14))!
    expect(e).toBeTruthy(); expect(seatsLeft(e, true)).toBeGreaterThan(0)
  })
})
