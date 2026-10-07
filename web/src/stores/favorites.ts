import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { read, write } from './ui'

const STORAGE_KEY = 'kw_favorite_stations'
export const MAX_FAVORITES = 6

/** Ulubione stacje (identyfikatory w kolejności dodania), zapamiętane w przeglądarce. */
export const useFavorites = defineStore('favorites', () => {
  const saved = read<unknown>(STORAGE_KEY, [])
  const ids = ref<string[]>(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string').slice(0, MAX_FAVORITES) : [])
  watch(ids, (value) => write(STORAGE_KEY, value), { deep: true })

  const set = computed(() => new Set(ids.value))
  const full = computed(() => ids.value.length >= MAX_FAVORITES)
  const has = (id: string | null | undefined) => !!id && set.value.has(id)

  /** Dodaje albo usuwa stację; zwraca nowy stan albo null, gdy lista jest pełna. */
  function toggle(id: string): boolean | null {
    if (has(id)) {
      ids.value = ids.value.filter((x) => x !== id)
      return false
    }
    if (full.value) return null
    ids.value = [...ids.value, id]
    return true
  }

  function restore(id: string, index: number) {
    if (has(id) || full.value) return
    const next = [...ids.value]
    next.splice(Math.min(index, next.length), 0, id)
    ids.value = next
  }

  return { ids, full, has, toggle, restore }
})
