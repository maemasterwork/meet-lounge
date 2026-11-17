import { describe, expect, it } from 'vitest'
import { ordersCsv } from './export-orders'
import type { Order } from '../types'

const order: Order = {
  n: 17, mode: 'pickup', items: [{ itemId: 'latte', qty: 2, free: false }], subtotal: 100, fee: 0, total: 100,
  status: 'done', paid: true, archived: true, mine: false, who: '=IMPORT("x")', at: '2026-11-17T12:00:00.000Z',
}

describe('ordersCsv', () => {
  it('exports archived and cancelled order information in escaped CSV cells', () => {
    const text = ordersCsv([order])
    expect(text).toContain('"order_number","created_at","status","archived"')
    expect(text).toContain('"17","2026-11-17T12:00:00.000Z","done","true"')
    expect(text).toContain("\"'=IMPORT(\"\"x\"\")\"")
    expect(ordersCsv([{ ...order, status: 'cancelled', archived: false }])).toContain('"cancelled","false"')
  })
})
