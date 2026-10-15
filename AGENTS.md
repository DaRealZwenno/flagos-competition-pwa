# Arbeitsweise im Projekt FlagOS Competition

Du arbeitest an FlagOS Competition (PWA, Ziel https://competition.flagos.app, passwortgeschützte Testphase) –
der Oberfläche für Turnier und Spieltag (Spielplan, Ergebnisse, Tabellen, Public Display).
Vorher hieß das Projekt „Tournament Control“ (`flagos-pwa`). Konzept: `FlagOS/20_Product/30_Features/20_Competition/FlagOS_Competition_Concept_V0.1_Draft.md`.
Antworte auf Deutsch. Produkt-Owner ist Sven; er führt Git-Merges und Deploys selbst aus.
Verfahren, Stack und Deployment sind aus FlagOS Broadcast und Stadium übernommen (`~/Developer/FlagOS/flagos-broadcast-pwa`, `…/flagos-stadium-pwa`).

## Feste Regeln
- Nichts ohne Rückfrage auf Live-Systeme anwenden (Supabase-Migrationen, Daten, Einstellungen, Server).
- **Die Datenbank-Tabellen heißen weiter `tournament_*`**, bis die Umbenennung freigegeben und migriert ist (Konzept, Abschnitt 7). Das Studio und die iOS-App laufen gegen dieselben Tabellen – nichts umbenennen, nichts löschen, keine Spalten ändern. Typen und Services (`Tournament…`) spiegeln die Datenbank und bleiben deshalb vorerst so.
- `app_role` nie als Competition-Recht werten; Rechte gelten pro Competition (geplant: `competition_members`).
- Importierte, noch nicht freigegebene Spieltage (`team_events.approval_status = 'pending'`) dürfen nie öffentlich erscheinen.
- Keine Geheimnisse ins Repo oder in den Build (nur der Supabase-anon-Schlüssel, in `.env.local`).
- Git-Befehle für Sven blockweise ausgeben, OHNE `#`-Kommentarzeilen.
- Nur die eigenen Änderungen committen; fremde, nicht committete Änderungen nie mit `git add -A` einsammeln. `.claude/` gehört nicht ins Repo.
- Unterscheide bestätigte Entscheidungen und Vorschläge (Konzept, Abschnitt 9).

## Technik
- React 19 mit React-Compiler-Lint (kein manuelles useCallback, keine Ref-Zuweisung im Render, kein setState direkt im Effect), TypeScript, Vite, Tailwind v4, Supabase JS, vite-plugin-pwa.
- Navigation heute über `activePage`-Zustand, Admin über `#admin` (Supabase-Login, `is_platform_admin()`); noch kein Router.
- Daten kommen aus FlagOS-Supabase (`.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Der Service-Worker cached nur die App-Hülle, nie Daten.
- Dev-Server-Port 5173 (5174 = Broadcast, 5175 = Stadium).
- Lokaler Code-Ort auf Svens Mac: `~/Developer/FlagOS/flagos-competition-pwa`. GitHub: `DaRealZwenno/flagos-competition-pwa` (früher `flagos-pwa`), Branch `main` = Stand, der deployt wird.

## Ablauf pro Änderung
1. Auf einem Feature-Branch arbeiten (`feat/…` oder `fix/…`), nie direkt auf `main`.
2. Vor Abgabe prüfen, alles muss fehlerfrei sein:
   - `npx tsc -b`
   - `npx eslint .`
   - `npx vite build`
   - Bei UI-Änderungen: im Browser bzw. mit Playwright in Handy-Ansicht (390 × 844, Touch), iPad (1180 × 820) und Laptop (1440 × 900) prüfen.
3. Kurz zusammenfassen, was sich geändert hat und warum (auf Deutsch, ohne Schrittprotokoll).
4. README bzw. Konzept ergänzen, wenn sich Verhalten oder Struktur ändert.
5. Git-Befehle an Sven ausgeben (oder einen Pull Request öffnen, wenn du direkt mit GitHub arbeitest):

   git switch -c <branch>
   git add -A
   git commit -m "<kurze deutsche Beschreibung>"
   git push -u origin <branch>

   git checkout main
   git pull
   git merge <branch>
   git push
   npm run deploy

   git branch -d <branch>

## Deploy (macht Sven auf dem Mac, nicht du)
`npm run deploy` startet `deploy/deploy.sh` (Hosting: Serverprofis, cPanel, Upload per SSH/rsync; Zugangsdaten in `deploy/deploy.config`, nicht eingecheckt). Das Skript:
- deployt nur von `main`, sauber und identisch mit `origin/main`,
- baut, entfernt Fremddateien, bricht ab bei `.map`/`.env` oder Nicht-anon-Schlüsseln im Build,
- lädt erst `.htaccess` und Assets, dann Einstiegsdateien (index.html, sw.js, manifest, version.json); alte Assets bleiben 30 Tage,
- prüft danach ohne Zugangsdaten: alles 401, HTTP → HTTPS,
- behält die letzten 5 Releases lokal.
Optionen: `npm run deploy -- --dry-run` (ohne Upload), `-- --rollback` (Releases zeigen), `-- --rollback <ID>` (zurück), `-- --force` (nur Git-Prüfungen überspringen, Notfall).
Server-Regeln stehen in `deploy/htaccess.template` (Basic Auth, Sicherheits-Header, CSP). Neue externe Abrufe brauchen einen Eintrag in `connect-src` bzw. `img-src` der CSP (Team-Logos kommen aus dem Supabase-Storage).
Zugänge: dieselbe Passwortdatei wie Broadcast (`/home/hoffandt/.htpasswds/broadcast.flagos.app/passwd`) – Benutzer pflegt Sven in cPanel → Verzeichnisschutz bei broadcast.flagos.app.

## Updates auf den Geräten
Die PWA sucht beim Öffnen, beim Zurückwechseln und alle 30 Minuten nach einer neuen Version und zeigt dann „Update verfügbar“. Aktiv wird die neue Version erst nach „Neu laden“, nie automatisch. Die laufende Version steht unten in der Seitenleiste (`v0.1.0 · Commit`).
