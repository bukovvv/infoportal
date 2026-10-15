// Importowany jako pierwszy w main.ts: przed routerem (zapamiętuje adres z #) i przed sklepami (czytają localStorage).
import { importMigratedSettings } from './utils/migration'

importMigratedSettings()
