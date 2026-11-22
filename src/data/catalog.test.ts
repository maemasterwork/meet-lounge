import { describe, expect, it } from 'vitest'
import { isDrinkCategory, normalizeSizes } from './catalog'

describe('isDrinkCategory', () => {
  it('recognizes the tea category as a drink', () => {
    expect(isDrinkCategory('tea')).toBe(true)
    expect(isDrinkCategory('breakfast')).toBe(false)
    expect(isDrinkCategory('food')).toBe(false)
  })
})

describe('normalizeSizes', () => {
  it('treats a single empty object as no configured sizes', () => {
    expect(normalizeSizes(JSON.parse('[{}]'))).toEqual([])
  })
})
