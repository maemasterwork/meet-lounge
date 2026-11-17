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

  it('colors the syruplatte drizzle itself instead of drawing over its default caramel', () => {
    const item = { id: 'syruplatte', cat: 'hot', name: 'Syrup latte', art: 'syruplatte' }
    const vanilla = art(item, { syrupId: 'vanilla' }, 'vanilla')

    expect(vanilla).toContain('stroke="#E6BD63"')
    expect(vanilla).not.toContain('#C9772B')
  })

  it('colors the iced latte bottom layer and wavy drizzle by syrup flavor', () => {
    const item = { id: 'syrupicedlatte', cat: 'cold', name: 'Syrup iced latte', art: 'syrupicedlatte' }
    const vanilla = art(item, { syrupId: 'vanilla' }, 'vanilla')
    const hazelnut = art(item, { syrupId: 'hazelnut' }, 'hazelnut')

    expect(vanilla).toContain('fill="#E6BD63"')
    expect(hazelnut).toContain('fill="#79523D"')
    expect(vanilla).toContain('<path d="M80 84 q10 8 20 0')
    expect(vanilla).toContain('stroke="#E6BD63"')
  })
})
