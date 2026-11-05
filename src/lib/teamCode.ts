// Teamcode-Format: IOC-Land (3) + Ort (3) + Team (3) = 9 Zeichen, angezeigt als GER-NUL-SPA.
// Beispiel: Neu-Ulm Spartans (Deutschland) → GER + NUL + SPA = GERNULSPA
//
// Das Land kommt aus der Länder-Tabelle (IOC-Code; für Länder ohne Olympisches Komitee ersatzweise der ISO-3-Code).
// Die Regeln für Ort und Team sind identisch zu iOS TeamInfo.generateCode().
//
// LOC: Initialen aller Stadtteile, bei weniger als 3 Buchstaben mit weiteren Buchstaben des letzten Worts
//      auffüllen (Neu-Ulm → N+U → +L → NUL; München → M → +UN → MUN). Umlaute werden zu Grundbuchstaben (ü → u, ß → ss).
// ORG: letztes bedeutungsvolles Wort des vollen Teamnamens (erste 3 Buchstaben). Generische Suffixe werden übersprungen.
// Zu kurze Teile werden je Block mit X aufgefüllt, damit der Code immer 9 Zeichen hat.

export const TEAM_CODE_LENGTH = 9

const ORG_SKIP = new Set([
  'FLAG', 'FLAGS', 'FOOTBALL', 'TACKLE', 'SENIOR', 'SENIORS',
  'JUNIOR', 'JUNIORS', 'JUGEND', 'LADIES', 'WOMEN', 'II', 'III', 'IV', 'V',
])

function toAscii(s: string): string {
  return s.replace(/[ßẞ]/g, 'SS').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function suggestTeamCode(iocCode: string, city: string, publicName: string): string {
  const cc = iocCode.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X')

  const parts = toAscii(city).toUpperCase().split(/[^A-Z]/).filter(Boolean)
  let loc = parts.map(p => p[0] ?? '').join('')
  if (loc.length < 3 && parts.length > 0) {
    const last = parts[parts.length - 1]
    loc += last.slice(1, 1 + (3 - loc.length))
  }
  loc = loc.slice(0, 3).padEnd(3, 'X')

  const words = publicName.trim().split(/\s+/).filter(Boolean)
  const meaningful = [...words].reverse().find(w => !ORG_SKIP.has(w.toUpperCase())) ?? words[0] ?? ''
  const org = toAscii(meaningful).replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X')

  return cc + loc + org
}

/** Eingabe vereinheitlichen: Großbuchstaben, ohne Bindestriche, Leerzeichen und Sonderzeichen. */
export function normalizeTeamCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidTeamCode(code: string): boolean {
  return /^[A-Z]{3}[A-Z]{3}[A-Z0-9]{3}$/.test(code)
}

/** GERNULSPA → GER-NUL-SPA. Alles, was nicht 9 Zeichen hat, bleibt unverändert. */
export function formatTeamCode(code: string): string {
  if (code.length !== TEAM_CODE_LENGTH) return code
  return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6)}`
}
