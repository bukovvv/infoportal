import type { VehicleInfo, VehicleType } from '@/api/types'

type Unit = VehicleInfo['vehicles'][number]

export const unitLabel = (u: Unit) => (u.name ? `${u.name} (${u.series})` : u.series)

/** „Pesa Elf (EN76)”, „2 × Pesa Elf 2 (48WE)”, „SA132 + SA108”. */
export function vehicleTitle(v: VehicleInfo) {
  const names = v.vehicles.map(unitLabel)
  return names.every((n) => n === names[0]) && names.length > 1 ? `${names.length} × ${names[0]}` : names.join(' + ')
}

/** Rodzaje pojazdów z rozkładu KW: nazwa (karta pojazdu), krótka (tablica, panel), opis i ikona. */
export const VEHICLE_KINDS: Record<VehicleType['kind'], { name: string; short: string; hint: string; icon: string }> = {
  emu: { name: 'pociąg elektryczny', short: 'elektryczny', hint: 'Elektryczny zespół trakcyjny.', icon: 'electric_bolt' },
  dmu: { name: 'szynobus', short: 'szynobus', hint: 'Spalinowy pojazd szynowy, zwykle krótszy od pociągu elektrycznego.', icon: 'train' },
  steam: { name: 'parowóz', short: 'parowóz', hint: 'Pociąg retro prowadzony parowozem.', icon: 'heat' },
  diesel: { name: 'lokomotywa spalinowa', short: 'lokomotywa spalinowa', hint: 'Wagony prowadzone lokomotywą spalinową.', icon: 'local_gas_station' },
}

/** Na tablicy i w karcie połączenia wyróżniamy tylko rodzaje inne niż zwykły pociąg elektryczny. */
export const unusualVehicle = (t: VehicleType | null | undefined): t is VehicleType => !!t && t.kind !== 'emu'

/** Udogodnienia podane przez przewoźnika (pomija nieznane). */
export function vehicleAmenities(t: VehicleType): { icon: string; label: string; on: boolean }[] {
  const out: { icon: string; label: string; on: boolean }[] = []
  if (t.wheelchair !== null) {
    out.push(t.wheelchair
      ? { icon: 'accessible', label: 'Dla osób na wózkach', on: true }
      : { icon: 'not_accessible', label: 'Niedostosowany do wózków', on: false })
  }
  if (t.bikes !== null) out.push({ icon: 'pedal_bike', label: t.bikes ? 'Przewóz rowerów' : 'Bez przewozu rowerów', on: t.bikes })
  return out
}
