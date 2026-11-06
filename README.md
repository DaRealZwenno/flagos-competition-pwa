# FlagOS Competition

PWA für **Turnier und Spieltag** im Flag Football – Spielplan, Ergebnisse, Tabellen und Public Display.
Zieladresse: **https://competition.flagos.app** (passwortgeschützte Testphase, gleiche Zugänge wie Broadcast und Stadium).

Vorher hieß das Projekt „Tournament Control“ (`flagos-pwa`, pwa.flagos.app). „Competition“ ist der Oberbegriff, weil es nicht nur Turniere gibt,
sondern auch Spieltage (und später Ligen). Konzept: `20_Product/30_Features/20_Competition/FlagOS_Competition_Concept_V0.2_Draft.md` im Projektordner FlagOS.

## Stand

| Bereich | Route | Stand |
| --- | --- | --- |
| Dashboard | `/` | Stufe 1: alle sichtbaren Competitions als Karten, Kennzahlen und Fortschritt der gewählten Competition |
| Spielplan, Ergebnisse, Tabellen, Teams | `/spielplan`, `/ergebnisse`, `/tabellen`, `/teams` | Stufe 1: echte Daten, nur lesen, aktualisiert sich selbst (Realtime, alle 30 s als Rückfall) |
| Competition anlegen (Wizard) | `/neu` | Stufe 2: Termin, Vorlage, Teams, Auslosung, als Entwurf speichern; Weg für alle Angemeldeten, gespeichert wird nur mit dem Recht „Termine verwalten“ im Gastgeber-Team oder der Verwaltung der Veranstaltung (die Datenbank entscheidet) |
| Leitung, Public Display | `/leitung`, `/display` | Platzhalter (Stufen 3 und 4 im Konzept) |
| Team-Verzeichnis | `/verzeichnis` | nutzbar (öffentliche Liste der freigegebenen Teams über `directory_public_teams()`, Standardansicht Liste) |
| Konto / Anmelden | `/konto` | Login mit FlagOS-Konto (Supabase Auth) |
| Einstellungen | `/einstellungen` | App-Version und Updates |
| Admin (Team-Verzeichnis verwalten, Team-Importe, Anfragen) | `/admin` (früher `/#admin`) | umgezogen in die Admin-PWA; hier nur Weiterleitung und Link für Plattform-Admins |

Aufbau und Aussehen wie Broadcast und Stadium: Icon-Seitenleiste (Logo = Startseite, Konto und Einstellungen unten), dunkelblaue Titelleiste;
in der installierten App (Chrome/Edge, Window Controls Overlay) zeichnet die App die Titelleiste selbst, Vor/Zurück und Teilen des Browsers entfallen.

Die Daten liegen im FlagOS-Supabase-Projekt. Die Tabellen heißen `competitions`, `competition_entries`, `competition_groups`, `competition_fields` und `games`, Termine liegen in `events`.
Besucher ohne Anmeldung lesen nur über die öffentlichen Funktionen (`competition_public_*`, `directory_public_teams`), Angemeldete zusätzlich aus den Tabellen (Zeilenschutz). Die Seite lädt alle 30 Sekunden nach; Realtime gilt nur für Angemeldete.
Das Broadcast Studio schreibt Live-Stände in dieselben Tabellen.

## Tech-Stack

- React 19, TypeScript, Vite, Tailwind CSS v4
- Supabase JS (Anmeldung, Daten, Realtime)
- vite-plugin-pwa (Service Worker nur für die App-Hülle, „Update verfügbar“-Hinweis)

## Entwickeln

```bash
npm ci
npm run dev          # http://localhost:5173/   (gegen die Probebühne)
npm run build        # tsc -b + Produktionsbuild
npx eslint .
npm test             # Spielplan, Tabellen, Teamcode, Umwandlungen (node --test)
```

`.env.local` (nicht im Repo) braucht `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (öffentlicher Schlüssel, wie in Broadcast und Stadium).
Port **5173**; Broadcast läuft auf 5174, Stadium auf 5175.

## Veröffentlichen

```bash
git checkout main && git pull
npm run deploy                  # prüfen → bauen → hochladen → nachprüfen
npm run deploy -- --dry-run     # nur simulieren
npm run deploy -- --rollback    # frühere Releases anzeigen / zurückspielen
```

Einrichtung (einmalig): Subdomain `competition.flagos.app` in cPanel anlegen (Dokumentenstamm `competition.flagos.app`, SSL),
`deploy/deploy.config.example` nach `deploy/deploy.config` kopieren und ausfüllen. Details in `AGENTS.md`.

## Struktur

```
src/
  components/   gemeinsame Bausteine (ui, StatCard, TitleBar, UpdateBanner, AppVersionCard)
  layouts/      App-Rahmen (Seitenleiste)
  lib/          Anmeldung, Competitions-Zustand, Tabellen-Berechnung, Spielplan (schedule), Formate, Links, PWA-Updates, Titelleiste
  pages/        Seiten (Dashboard, Platzhalter, Team-Verzeichnis)
  services/     competitionApi.ts und directoryApi.ts = einzige Stellen mit Datenbank-Namen; *Mapping.ts = Umwandlung (reine Funktionen)
  types/        competition.ts und directory.ts = Darstellungsmodelle
tests/          node --test (Spielplan, Tabellen, Teamcode, Umwandlungen)
deploy/         Deploy-Skript, Server-Regeln (htaccess.template)
```
