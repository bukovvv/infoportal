import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_FAVORITES, useFavorites } from './favorites'

describe('ulubione stacje', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('dodaje, usuwa i zapamiętuje w przeglądarce', async () => {
    const f = useFavorites()
    expect(f.toggle('30601')).toBe(true)
    expect(f.toggle('42606')).toBe(true)
    expect(f.has('30601')).toBe(true)
    expect(f.toggle('30601')).toBe(false)
    await nextTick()
    expect(JSON.parse(localStorage.getItem('kw_favorite_stations')!)).toEqual(['42606'])
    setActivePinia(createPinia())
    expect(useFavorites().ids).toEqual(['42606'])
  })

  it('cofnięcie wraca na to samo miejsce, a lista ma limit', () => {
    const f = useFavorites()
    ;['a', 'b', 'c'].forEach((id) => f.toggle(id))
    f.toggle('b')
    f.restore('b', 1)
    expect(f.ids).toEqual(['a', 'b', 'c'])
    for (let i = f.ids.length; i < MAX_FAVORITES; i++) f.toggle(`x${i}`)
    expect(f.full).toBe(true)
    expect(f.toggle('nadmiarowa')).toBeNull()
    expect(f.ids).toHaveLength(MAX_FAVORITES)
  })

  it('ignoruje uszkodzone dane z przeglądarki', () => {
    localStorage.setItem('kw_favorite_stations', '"nie lista"')
    setActivePinia(createPinia())
    expect(useFavorites().ids).toEqual([])
  })
})
