import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Notice } from '@/api/types'
import { useAdmin } from '@/stores/admin'
import { useUi } from '@/stores/ui'
import { endOfDay, extendedEnd, toForm, type NoticeForm } from '@/utils/adminNotices'

export type ExtendBy = 2 | 24 | 168 | 'day'
export const EXTEND_OPTIONS: { value: ExtendBy; label: string }[] = [
  { value: 2, label: 'o 2 godziny' },
  { value: 'day', label: 'do końca dnia' },
  { value: 24, label: 'o 1 dzień' },
  { value: 168, label: 'o 7 dni' },
]

/** Szybkie zmiany komunikatu z listy i pulpitu (bez otwierania edytora); każda z komunikatem i — gdzie się da — „Cofnij”. */
export function useNoticeActions() {
  const admin = useAdmin()
  const ui = useUi()
  const router = useRouter()
  const busy = ref<number | null>(null)

  async function update(n: Notice, over: Partial<NoticeForm>, message: string, undo = true) {
    busy.value = n.id
    try {
      await admin.saveNotice(toForm(n, over), n.id)
      ui.notify(message, undo ? { label: 'Cofnij', run: () => void admin.saveNotice(toForm(n), n.id) } : undefined)
    } catch (e) {
      ui.notify((e as Error).message)
    } finally {
      busy.value = null
    }
  }

  const extend = (n: Notice, by: ExtendBy) =>
    update(n, { endsAt: by === 'day' ? endOfDay() : extendedEnd(n, by) }, 'Przedłużono komunikat.')
  const hide = (n: Notice) => update(n, { active: false }, 'Ukryto komunikat — jest teraz w szkicach.')
  const publish = (n: Notice) => update(n, { active: true }, 'Komunikat znów jest widoczny.')
  const showNow = (n: Notice) => update(n, { startsAt: '' }, 'Komunikat jest już widoczny dla pasażerów.')
  const edit = (n: Notice) => router.push({ name: 'admin-edit', params: { id: n.id } })
  const duplicate = (n: Notice) => router.push({ name: 'admin-new', query: { z: String(n.id) } })

  return { busy, update, extend, hide, publish, showNow, edit, duplicate }
}
