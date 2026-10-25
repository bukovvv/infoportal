import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, ApiError, setCsrf } from '@/api/client'
import type { AdminSession, Notice } from '@/api/types'
import type { NoticeForm } from '@/utils/adminNotices'

export const useAdmin = defineStore('admin', () => {
  const session = ref<AdminSession | null>(null)

  async function check() {
    session.value = await api.admin.session()
    setCsrf(session.value.csrf)
  }

  async function login(username: string, password: string) {
    session.value = await api.admin.login(username, password)
    setCsrf(session.value.csrf)
  }

  async function logout() {
    await api.admin.logout().catch(() => undefined)
    session.value = { loggedIn: false, configured: session.value?.configured }
    setCsrf(undefined)
  }

  /** Wywołanie API admina; przy wygaśnięciu sesji przełącza na ekran logowania. */
  async function call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 419)) session.value = { loggedIn: false, configured: true }
      throw e
    }
  }

  /** komunikaty w panelu (wszystkie, także szkice i wygasłe) — wspólne dla pulpitu, listy i edytora */
  const notices = ref<Notice[] | null>(null)
  const noticesError = ref<string | null>(null)

  async function loadNotices() {
    try {
      notices.value = await call(() => api.admin.notices())
      noticesError.value = null
    } catch (e) {
      noticesError.value = (e as Error).message
    }
  }

  /** Zapis komunikatu (nowy albo zmiana); lista w panelu odświeża się od razu. */
  async function saveNotice(form: NoticeForm, id?: number): Promise<Notice> {
    const saved = await call(() => api.admin.saveNotice({ ...form, trains: form.trains.map(String) }, id))
    const list = notices.value ?? []
    notices.value = id ? list.map((n) => (n.id === id ? saved : n)) : [saved, ...list]
    return saved
  }

  async function deleteNotice(id: number) {
    await call(() => api.admin.deleteNotice(id))
    notices.value = (notices.value ?? []).filter((n) => n.id !== id)
  }

  return { session, check, login, logout, call, notices, noticesError, loadNotices, saveNotice, deleteNotice }
})
