import type { VehicleInfo } from '@/api/types'

type Unit = VehicleInfo['vehicles'][number]

export const unitLabel = (u: Unit) => (u.name ? `${u.name} (${u.series})` : u.series)

/** „Pesa Elf (EN76)”, „2 × Pesa Elf 2 (48WE)”, „SA132 + SA108”. */
export function vehicleTitle(v: VehicleInfo) {
  const names = v.vehicles.map(unitLabel)
  return names.every((n) => n === names[0]) && names.length > 1 ? `${names.length} × ${names[0]}` : names.join(' + ')
}
