import type { Severity } from '@/api/types'

export const noticeIcon: Record<Severity, string> = { danger: 'cancel-fill', warning: 'warning-fill', info: 'info-fill' }
export const noticeLabel: Record<Severity, string> = { danger: 'Poważne utrudnienie', warning: 'Utrudnienie', info: 'Informacja' }
