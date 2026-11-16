import { describe, expect, it } from 'vitest'
import { art } from './art'

describe('syrup artwork', () => {
  it('uses a distinct flavor color in the drink illustration', () => {
    const item = { id: 'latte', cat: 'hot', name: 'Latte', art: 'latte' }
    const vanilla = art(item, { syrupId: 'vanilla' }, 'vanilla')
    const caramel = art(item, { syrupId: 'caramel' }, 'caramel')
    const hazelnut = art(item, { syrupId: 'hazelnut' }, 'hazelnut')

    expect(vanilla).toContain('stroke="#E6BD63"')
    expect(caramel).toContain('stroke="#C9772B"')
    expect(hazelnut).toContain('stroke="#79523D"')
    expect(new Set([vanilla, caramel, hazelnut]).size).toBe(3)
  })
})
