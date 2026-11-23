import { beforeEach, describe, expect, it } from 'vitest'
import { migrateUi, useUi } from './ui'

beforeEach(() => {
  useUi.setState({ favorites: [] })
})

describe('favorites', () => {
  it('does not seed latte and cheesecake automatically', () => {
    expect(useUi.getState().favorites).toEqual([])
  })

  it('toggles an item once instead of duplicating it', () => {
    const { toggleFavorite } = useUi.getState()
    toggleFavorite('latte')
    toggleFavorite('latte')
    toggleFavorite('latte')
    expect(useUi.getState().favorites).toEqual(['latte'])
  })

  it('removes the old default favorites during migration', () => {
    expect(migrateUi({ favorites: ['latte', 'cheesecake', 'latte'] }, 1)).toMatchObject({ favorites: [] })
  })
})
