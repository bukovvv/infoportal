import type { Status } from '@/api/types'
import { ago, clock, dateTime, plural } from './format'

// Stan źródeł danych w panelu (zakładka „Stan źródeł” i skrót na pulpicie).

export type Ops = {
  gtfsSourceModifiedAt: string | null
  gtfsDownloadedAt: string | null
  rtCheckedAt: string | null
  rtSourceModifiedAt: string | null
  backups: { count: number; latestAt: string | null; latestSize: number | null }
  alerts: { configured: boolean; problemSince: string | null; alertedAt: string | null }
  cronErrors: { modifiedAt: string | null; lines: string[] }
}
export type Health = Status & {
  server: { php?: string; extensions?: Record<string, boolean>; storageWritable?: boolean; passwordConfigured?: boolean; files?: Record<string, { size: number; modifiedAt: string } | null> }
  ops?: Ops
}
export type HealthState = 'ok' | 'warn' | 'error'
export type HealthRow = { icon: string; title: string; text: string; sub?: string; state: HealthState }

export const size = (n: number | null | undefined) => (n == null ? '–' : n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`)
const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '–')
const hoursSince = (iso: string | null | undefined) => (iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Infinity)
export const stateLabel: Record<HealthState, string> = { ok: 'Działa', warn: 'Uwaga', error: 'Błąd' }
export const stateClass: Record<HealthState, string> = { ok: 'tag-ontime', warn: 'tag-delay', error: 'tag-error' }

export function healthSummary(level: Status['level'] | undefined) {
  const l = level ?? 'ok'
  return {
    color: l === 'ok' ? 'success-container' : l === 'down' ? 'error-container' : 'warning-container',
    icon: l === 'ok' ? 'check_circle-fill' : l === 'down' ? 'error-fill' : 'warning-fill',
    title: l === 'ok' ? 'Wszystkie źródła działają' : l === 'down' ? 'Portal działa w trybie awaryjnym' : 'Część źródeł wymaga uwagi',
  }
}

export function sourceRows(h: Health): HealthRow[] {
  const tt = h.timetable
  const live = h.live
  const rt = live.rt
  const ops = h.ops
  return [
    {
      icon: 'event',
      title: 'Rozkład jazdy (GTFS)',
      text: tt.ok ? `Ważny do ${day(tt.validUntil)}, jeszcze ${tt.daysLeft} ${plural(tt.daysLeft ?? 0, 'dzień', 'dni', 'dni')} · ${tt.trips} kursów, ${tt.stations} stacji` : 'Rozkład wygasł albo jest niedostępny',
      sub: `Import ${ago(tt.importedAt)} (${dateTime(tt.importedAt)})${ops?.gtfsSourceModifiedAt ? ` · plik u źródła z ${day(ops.gtfsSourceModifiedAt)}` : ''}`,
      state: !tt.ok ? 'error' : (tt.daysLeft ?? 0) <= 3 || hoursSince(tt.importedAt) > 72 ? 'warn' : 'ok',
    },
    {
      icon: 'schedule',
      title: 'Opóźnienia PKP PLK (GTFS-RT)',
      text: rt?.ok ? `${rt.count} ${plural(rt.count, 'kurs', 'kursy', 'kursów')} z opóźnieniami · feed z ${clock(rt.feedTime)} (${ago(rt.feedTime)})` : `Błąd: ${rt?.error ?? 'brak danych'}`,
      sub: ops?.rtCheckedAt ? `Feed sprawdzony ${ago(ops.rtCheckedAt)} · stojący feed to zwykle problem po stronie źródła` : undefined,
      state: !rt?.ok ? 'error' : hoursSince(rt.feedTime) > 0.25 ? 'warn' : 'ok',
    },
    {
      icon: 'update',
      title: 'Odświeżanie danych na żywo (CRON)',
      text: live.generatedAt ? `Ostatnio ${ago(live.generatedAt)} (${clock(live.generatedAt)}) · co minutę` : 'Jeszcze nie uruchomione',
      sub: live.ok ? undefined : 'Sprawdź CRON z refresh-live.php i błędy CRON-a poniżej',
      state: live.ok ? 'ok' : 'error',
    },
    {
      icon: 'route',
      title: 'Pozycje pociągów',
      text: `${live.trains} ${plural(live.trains, 'pociąg', 'pociągi', 'pociągów')} w ruchu, ${live.rtTrains ?? 0} z opóźnieniem PLK`,
      sub: live.gpsEnabled === false ? 'GPS wyłączony (gps_enabled w konfiguracji), pozycje wyliczane z rozkładu' : live.gps?.ok ? `GPS: ${live.gps.provider}, ${live.gps.count} pozycji` : `GPS: ${live.gps?.error ?? 'brak danych'}`,
      state: live.ok && (live.gpsEnabled === false || !!live.gps?.ok) ? 'ok' : 'warn',
    },
  ]
}

export function upkeepRows(ops: Ops | undefined): HealthRow[] {
  if (!ops) return []
  const b = ops.backups
  const a = ops.alerts
  const c = ops.cronErrors
  return [
    {
      icon: 'backup',
      title: 'Kopie bazy komunikatów',
      text: b.count ? `${b.count} ${plural(b.count, 'kopia', 'kopie', 'kopii')} · ostatnia ${ago(b.latestAt)} (${size(b.latestSize)})` : 'Brak kopii',
      sub: b.count ? undefined : 'Kopię robi CRON z backup-db.php o 03:15',
      state: !b.count ? 'warn' : hoursSince(b.latestAt) > 48 ? 'warn' : 'ok',
    },
    {
      icon: 'mail',
      title: 'Alerty e-mail',
      text: !a.configured ? 'Wyłączone: brak adresu (KW_ALERT_EMAIL w deploy.env)' : a.problemSince ? `Problem od ${dateTime(a.problemSince)}` : 'Włączone, brak aktywnego problemu',
      sub: a.alertedAt ? `Ostatni alert wysłany ${ago(a.alertedAt)}` : undefined,
      state: !a.configured ? 'warn' : a.problemSince ? 'warn' : 'ok',
    },
    {
      icon: 'terminal',
      title: 'Błędy CRON-a',
      text: c.lines.length ? `Ostatni wpis ${ago(c.modifiedAt)} (${dateTime(c.modifiedAt)})` : 'Brak błędów',
      state: !c.lines.length ? 'ok' : hoursSince(c.modifiedAt) < 24 ? 'error' : 'warn',
    },
  ]
}
