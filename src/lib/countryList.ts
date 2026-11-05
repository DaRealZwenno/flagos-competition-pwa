// Länder-Tabelle (Migration 057): ISO-2 als Schlüssel, IOC-Code für Anzeige und Teamcode.
export interface Country {
  iso2: string
  ioc_code: string
  ioc_member: boolean
  name_de: string
  name_en: string
}

// Notbehelf, falls die Tabelle (noch) nicht erreichbar ist
export const FALLBACK: Country[] = [
  { iso2: 'DE', ioc_code: 'GER', ioc_member: true, name_de: 'Deutschland', name_en: 'Germany' },
  { iso2: 'AT', ioc_code: 'AUT', ioc_member: true, name_de: 'Österreich', name_en: 'Austria' },
  { iso2: 'CH', ioc_code: 'SUI', ioc_member: true, name_de: 'Schweiz', name_en: 'Switzerland' },
  { iso2: 'US', ioc_code: 'USA', ioc_member: true, name_de: 'Vereinigte Staaten', name_en: 'United States' },
  { iso2: 'GB', ioc_code: 'GBR', ioc_member: true, name_de: 'Vereinigtes Königreich', name_en: 'United Kingdom' },
  { iso2: 'FR', ioc_code: 'FRA', ioc_member: true, name_de: 'Frankreich', name_en: 'France' },
]

const FIRST = ['DE', 'AT', 'CH']

/** Deutschland, Österreich, Schweiz zuerst, danach alphabetisch nach deutschem Namen. */
export function sortCountries(list: Country[]): Country[] {
  return [...list].sort((a, b) => {
    const ia = FIRST.indexOf(a.iso2), ib = FIRST.indexOf(b.iso2)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.name_de.localeCompare(b.name_de, 'de')
  })
}

