import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { FALLBACK, sortCountries, type Country } from './countryList'

let cache: Promise<Country[]> | null = null

export function loadCountries(): Promise<Country[]> {
  if (!cache) {
    cache = (async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('iso2, ioc_code, ioc_member, name_de, name_en')
      if (error || !data || data.length === 0) {
        cache = null // beim nächsten Aufruf erneut versuchen
        return FALLBACK
      }
      return data as Country[]
    })()
  }
  return cache
}

export function useCountries() {
  const [list, setList] = useState<Country[]>(FALLBACK)
  useEffect(() => {
    let cancelled = false
    loadCountries().then(c => { if (!cancelled) setList(c) })
    return () => { cancelled = true }
  }, [])
  const sorted = useMemo(() => sortCountries(list), [list])
  const byIso2 = useMemo(() => new Map(list.map(c => [c.iso2, c])), [list])
  /** IOC-Code zu einem ISO-2-Code; unbekannte Länder zeigen den ISO-Code unverändert. */
  const iocOf = (iso2: string): string => byIso2.get(iso2?.toUpperCase())?.ioc_code ?? iso2
  return { countries: sorted, iocOf }
}
