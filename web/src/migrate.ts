// Importowany jako pierwszy w main.ts: przed routerem (zapamiętuje adres z #) i przed sklepami (czytają localStorage).
import { importMigratedSettings } from './utils/migration'
import { LAST_REGION_KEY, region, regionPath, REGIONS, type RegionId } from './utils/region'

importMigratedSettings()

// region: zapamiętany przy każdym wejściu; zainstalowana aplikacja otwiera ostatnio używany — tylko przy uruchomieniu
// (start pod /, bez przejścia z innej strony serwisu), żeby przełącznik regionu „Wielkopolska” nie wracał do Małopolski
try {
  const last = localStorage.getItem(LAST_REGION_KEY) as RegionId | null
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const fromSite = !!document.referrer && new URL(document.referrer).origin === location.origin
  if (standalone && !fromSite && location.pathname === '/' && !location.search && !location.hash && last && last !== region.id && REGIONS[last]) {
    location.replace(regionPath('/', REGIONS[last]))
  } else {
    localStorage.setItem(LAST_REGION_KEY, region.id)
  }
} catch { /* pamięć przeglądarki jest opcjonalna */ }
