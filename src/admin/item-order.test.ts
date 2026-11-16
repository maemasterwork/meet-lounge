import { describe, expect, it } from 'vitest'
import { swapVisibleItems } from './item-order'

describe('swapVisibleItems', () => {
  it('swaps filtered items without moving hidden items', () => {
    expect(swapVisibleItems(['a', 'x', 'b', 'y', 'c'], ['a', 'b', 'c'], 'a', 'c')).toEqual(['c', 'x', 'b', 'y', 'a'])
  })

  it('ignores ids outside the visible list', () => {
    const ids = ['a', 'b']
    expect(swapVisibleItems(ids, ['a'], 'a', 'b')).toBe(ids)
  })
})
