import { describe, expect, it } from 'vitest'
import { diffNotices } from './localNotify'
import type { Offer, Order } from '../types'

const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}:${v.n}` : k)
const n = (v: number) => String(v)
const order = (_id: string, n: number, status: Order['status']) => ({ n, status }) as unknown as Order
const offer = (id: number, extra: Partial<Offer> = {}) => ({ id, title: { fa: 'ف', en: 'Hot' }, body: { fa: '', en: 'Two for one' }, itemId: 'latte', pct: 10, audience: 'all', active: true, read: false, ...extra }) as Offer

describe('local notifications', () => {
  it('says nothing on the first snapshot (no replay of old orders)', () => {
    const r = diffNotices(null, [order('a', 7, 'ready')], [offer(1)], t, n, 'en')
    expect(r.notices).toEqual([])
    expect(r.next.orders.get(7)).toBe('ready')
  })
  it('notifies when an order reaches ready, out or done, once', () => {
    const first = diffNotices(null, [order('a', 7, 'prep')], [], t, n, 'en').next
    const r = diffNotices(first, [order('a', 7, 'ready')], [], t, n, 'en')
    expect(r.notices.map((x) => [x.title, x.tag, x.url])).toEqual([['notify.order.ready:7', 'order-7', './#me']])
    expect(diffNotices(r.next, [order('a', 7, 'ready')], [], t, n, 'en').notices).toEqual([])
  })
  it('stays quiet for steps the customer does not wait on (prep, cancelled)', () => {
    const first = diffNotices(null, [order('a', 1, 'new')], [], t, n, 'en').next
    expect(diffNotices(first, [order('a', 1, 'prep')], [], t, n, 'en').notices).toEqual([])
    expect(diffNotices(first, [order('a', 1, 'cancelled')], [], t, n, 'en').notices).toEqual([])
  })
  it('notifies for a new unread active offer in the visitor language, not for old, read or inactive ones', () => {
    const first = diffNotices(null, [], [offer(1)], t, n, 'en').next
    const r = diffNotices(first, [], [offer(1), offer(2), offer(3, { read: true }), offer(4, { active: false })], t, n, 'en')
    expect(r.notices.map((x) => [x.title, x.body, x.tag])).toEqual([['Hot', 'Two for one', 'offer-2']])
  })
})
