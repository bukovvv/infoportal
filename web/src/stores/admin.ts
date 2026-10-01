import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, ApiError, setCsrf } from '@/api/client'
import type { AdminSession } from '@/api/types'

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

  return { session, check, login, logout, call }
})
