import { describe, expect, it } from 'vitest'
import { matchesAudience, offerMessage, orderMessage } from './logic'

const o = { id: 7, title_fa: 'لاته', title_en: 'Latte', body_fa: 'تخفیف', body_en: 'Discount' }
describe('push logic', () => {
  it('writes an offer in the customer language and falls back to Persian when English is empty', () => {
    expect(offerMessage(o, 'fa')).toMatchObject({ title: 'لاته', dir: 'rtl', tag: 'offer-7', url: './#menu' })
    expect(offerMessage(o, 'en')).toMatchObject({ title: 'Latte', dir: 'ltr' })
    expect(offerMessage({ ...o, title_en: '', body_en: '' }, 'en')).toMatchObject({ title: 'لاته', body: 'تخفیف' })
  })
  it('notifies only for ready, on the way and done', () => {
    expect(orderMessage('ready', 104, 'en')?.title).toBe('Order 104 is ready ☕')
    expect(orderMessage('ready', 104, 'fa')?.title).toContain('۱۰۴')
    expect(orderMessage('out', 1, 'en')).not.toBeNull()
    expect(orderMessage('done', 1, 'en')?.body).toMatch(/coin/)
    expect(orderMessage('prep', 1, 'en')).toBeNull()
    expect(orderMessage('cancelled', 1, 'en')).toBeNull()
  })
  it('targets audiences: all, repeat customers, customers close to a reward', () => {
    expect(matchesAudience('all', 0, 0, 6)).toBe(true)
    expect(matchesAudience('repeat', 0, 2, 6)).toBe(false)
    expect(matchesAudience('repeat', 0, 3, 6)).toBe(true)
    expect(matchesAudience('near_reward', 4, 1, 6)).toBe(true)     // 2 away
    expect(matchesAudience('near_reward', 5, 1, 6)).toBe(true)     // 1 away
    expect(matchesAudience('near_reward', 3, 1, 6)).toBe(false)    // 3 away
    expect(matchesAudience('near_reward', 0, 1, 6)).toBe(false)    // fresh start
    expect(matchesAudience('near_reward', 6, 1, 6)).toBe(false)    // has a reward ready
  })
})
