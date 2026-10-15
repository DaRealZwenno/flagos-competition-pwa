#!/usr/bin/env bash
# ============================================================
# Deploy: baut die PWA und veröffentlicht sie auf https://competition.flagos.app
#
#   npm run deploy                       prüfen → bauen → hochladen → nachprüfen
#   npm run deploy -- --dry-run          wie oben, aber Upload nur simulieren (Build läuft trotzdem)
#   npm run deploy -- --force            Git-Prüfungen überspringen (Notfall) – Ziel-/Sicherheitsprüfungen bleiben
#   npm run deploy -- --rollback         gespeicherte Releases auflisten
#   npm run deploy -- --rollback <ID>    gespeichertes Release erneut veröffentlichen (ohne Build)
#
# Ablauf Upload (nicht atomar, aber in sicherer Reihenfolge):
#   1. .htaccess + Assets (alte gehashte Assets bleiben liegen → offene ältere Clients laufen weiter)
#   2. Einstiegsdateien zuletzt (index.html, sw.js, manifest, version.json)
#   3. Aufräumen: Assets, die nicht zum aktuellen Release gehören und älter als 30 Tage sind
#   4. Nachprüfung ohne Zugangsdaten: alles muss 401 liefern, HTTP → HTTPS ohne Passwortabfrage
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

readonly PUBLIC_HOST="competition.flagos.app"
readonly EXPECTED_REMOTE_DIR="competition.flagos.app"    # relativ zum Home-Verzeichnis, fest
readonly ENTRY_FILES="index.html sw.js registerSW.js manifest.webmanifest version.json"
readonly WELL_KNOWN_DIRS="acme-challenge pki-validation cpanel-dcv"
readonly KEEP_RELEASES=5
readonly PRUNE_DAYS=30
readonly RELEASES_DIR="deploy/releases"

die()  { printf '✗ %s\n' "$*" >&2; exit 1; }
step() { printf '▶ %s\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }
warn() { printf '  ⚠ %s\n' "$*"; }

# ---------- Optionen ----------
FORCE=0; DRY=0; ROLLBACK=""; LIST_ROLLBACK=0
while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1 ;;
    --dry-run|-n) DRY=1 ;;
    --rollback)
      if [ $# -ge 2 ] && [ "${2#--}" = "$2" ]; then ROLLBACK="$2"; shift; else LIST_ROLLBACK=1; fi ;;
    *) die "Unbekannte Option: $1  (erlaubt: --dry-run, --force, --rollback [ID])" ;;
  esac
  shift
done

if [ $LIST_ROLLBACK -eq 1 ]; then
  echo "Gespeicherte Releases (neueste zuerst):"
  ls -1t "$RELEASES_DIR" 2>/dev/null | grep -v '^\.' || echo "  (keine)"
  echo "Erneut veröffentlichen: npm run deploy -- --rollback <ID>"
  exit 0
fi

# ---------- Konfiguration (als Daten gelesen, nicht ausgeführt) ----------
CONFIG="deploy/deploy.config"
[ -f "$CONFIG" ] || die "$CONFIG fehlt. Vorlage: cp deploy/deploy.config.example $CONFIG"
SSH_HOST=""; SSH_PORT="22"; SSH_USER=""; SSH_KEY=""; REMOTE_DIR=""; AUTH_USER_FILE=""
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\#*) continue ;; esac
  key="${line%%=*}"; val="${line#*=}"
  val="${val#\"}"; val="${val%\"}"
  case "$key" in
    SSH_HOST) SSH_HOST="$val" ;;
    SSH_PORT) SSH_PORT="$val" ;;
    SSH_USER) SSH_USER="$val" ;;
    SSH_KEY) SSH_KEY="${val/#\$HOME/$HOME}"; SSH_KEY="${SSH_KEY/#\~/$HOME}" ;;
    REMOTE_DIR) REMOTE_DIR="$val" ;;
    AUTH_USER_FILE) AUTH_USER_FILE="$val" ;;
    *) die "Unbekannter Eintrag in $CONFIG: $key" ;;
  esac
done < "$CONFIG"

[[ "$SSH_HOST" =~ ^[A-Za-z0-9.-]+$ ]]   || die "SSH_HOST ungültig"
[[ "$SSH_PORT" =~ ^[0-9]+$ ]]           || die "SSH_PORT ungültig"
[[ "$SSH_USER" =~ ^[a-z][a-z0-9_-]*$ ]] || die "SSH_USER ungültig"
[ "$REMOTE_DIR" = "$EXPECTED_REMOTE_DIR" ] || die "Unerwartetes Deploy-Ziel „$REMOTE_DIR“ (erlaubt: $EXPECTED_REMOTE_DIR)"
[[ "$AUTH_USER_FILE" =~ ^/home/${SSH_USER}/\.htpasswds/[A-Za-z0-9._/-]+$ ]] || die "AUTH_USER_FILE ungültig"
[ -z "$SSH_KEY" ] || [ -f "$SSH_KEY" ] || die "SSH-Schlüssel nicht gefunden: $SSH_KEY"
readonly REMOTE_ABS="/home/${SSH_USER}/${REMOTE_DIR}"

# SSH: Host-Key muss bereits bekannt sein und passen; keine Passwort-Abfragen, kein Agent-Forwarding
SSH_OPTS=(-p "$SSH_PORT" -o LogLevel=ERROR -o StrictHostKeyChecking=yes -o BatchMode=yes -o ForwardAgent=no -o ConnectTimeout=15)
[ -n "$SSH_KEY" ] && SSH_OPTS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
RSYNC_SSH="ssh"; for o in "${SSH_OPTS[@]}"; do RSYNC_SSH="$RSYNC_SSH $(printf '%q' "$o")"; done
remote() { ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_HOST}" "$@"; }
TARGET="${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/"

# ============================================================
if [ -n "$ROLLBACK" ]; then
  [[ "$ROLLBACK" =~ ^[A-Za-z0-9._-]+$ ]] || die "Ungültige Release-ID"
  SRC="$RELEASES_DIR/$ROLLBACK"
  [ -f "$SRC/index.html" ] || die "Release $ROLLBACK nicht gefunden (npm run deploy -- --rollback zeigt alle)"
  step "Rollback auf $ROLLBACK (kein Build, keine Git-Prüfung)"
else
  # ---------- 1. Git-Prüfungen ----------
  step "1/6 Git-Stand prüfen"
  PROBLEMS=(); PCOUNT=0
  problem() { PROBLEMS+=("$1"); PCOUNT=$((PCOUNT+1)); }
  BRANCH="$(git branch --show-current)"
  [ "$BRANCH" = "main" ] || problem "Du bist auf Branch „$BRANCH“, nicht auf main  →  git checkout main"
  [ -z "$(git status --porcelain)" ] || problem "Uncommittete Änderungen  →  erst committen (git status)"
  if git fetch --quiet origin main 2>/dev/null; then
    LOCAL="$(git rev-parse HEAD)"; REMOTE_HEAD="$(git rev-parse origin/main)"
    if [ "$BRANCH" = "main" ] && [ "$LOCAL" != "$REMOTE_HEAD" ]; then
      if git merge-base --is-ancestor "$LOCAL" "$REMOTE_HEAD"; then problem "GitHub ist weiter  →  git pull"
      elif git merge-base --is-ancestor "$REMOTE_HEAD" "$LOCAL"; then problem "Lokale Commits nicht auf GitHub  →  git push"
      else problem "main und GitHub auseinandergelaufen  →  git pull, Konflikte lösen, git push"; fi
    fi
  else
    problem "GitHub nicht erreichbar – Stand von origin/main nicht geprüft"
  fi
  if [ $PCOUNT -gt 0 ]; then
    for p in "${PROBLEMS[@]}"; do printf '  ✗ %s\n' "$p"; done
    if [ $FORCE -eq 1 ]; then warn "--force: Git-Prüfungen übersprungen"
    elif [ $DRY -eq 1 ]; then warn "Probelauf: geht weiter – ein echter Deploy würde hier abbrechen"
    else die "Abbruch. (Notfall: npm run deploy -- --force)"; fi
  else
    ok "main, sauber, identisch mit GitHub"
  fi

  # ---------- 2. Build ----------
  step "2/6 Build"
  npm run build

  # ---------- 3. Artefakt prüfen + .htaccess erzeugen ----------
  step "3/6 Build prüfen"
  [ -f dist/index.html ] && [ -f dist/sw.js ] && [ -f dist/version.json ] || die "Build unvollständig (index.html / sw.js / version.json fehlt)"
  find dist \( -name '.DS_Store' -o -name '._*' -o -name 'Thumbs.db' \) -type f -delete   # Finder-/System-Müll aus public/
  BAD="$(find dist \( -name '*.map' -o -name '.env*' -o -name '*.bak' -o -name '*.sql' \) -print)"
  [ -z "$BAD" ] || die "Unerwünschte Dateien im Build: $BAD"
  # iCloud-Konfliktkopien („sw 2.js“) entfernen – entstehen, wenn der Projektordner in iCloud Drive liegt
  CONFLICTS="$(find dist -type f -name '* [0-9]*' -print)"
  if [ -n "$CONFLICTS" ]; then
    warn "iCloud-Konfliktkopien im Build entfernt:"; printf '%s\n' "$CONFLICTS" | sed 's/^/      /'
    find dist -type f -name '* [0-9]*' -delete
  fi
  # Geheime Supabase-Schlüssel: echte sb_secret_-Schlüssel oder JWTs mit anderer Rolle als „anon“
  python3 - <<'PYCHECK'
import base64, json, pathlib, re, sys
bad = []
jwt = re.compile(rb"eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}")
secret = re.compile(rb"sb_secret_[A-Za-z0-9_-]{16,}")
for f in pathlib.Path("dist").rglob("*"):
    if not f.is_file() or f.suffix not in {".js", ".html", ".json", ".webmanifest", ".css"}:
        continue
    data = f.read_bytes()
    if secret.search(data):
        bad.append(f"{f}: sb_secret_-Schlüssel")
    for m in jwt.finditer(data):
        seg = m.group(1) + b"=" * (-len(m.group(1)) % 4)
        try:
            role = json.loads(base64.urlsafe_b64decode(seg)).get("role")
        except Exception:
            continue
        if role and role != "anon":
            bad.append(f"{f}: JWT mit Rolle „{role}“")
if bad:
    print("✗ GEHEIMER SCHLÜSSEL IM BUILD – Abbruch:", *bad, sep="\n    ", file=sys.stderr)
    sys.exit(1)
PYCHECK
  grep -q 'afqqeznlzamobmhrkqyt.supabase.co' dist/assets/*.js || warn "Supabase-Projekt im Build nicht gefunden – Anmeldung und Daten funktionieren dann nicht (.env.local prüfen)"
  python3 - "$AUTH_USER_FILE" <<'PY'
from pathlib import Path
import sys
value = sys.argv[1]
if not value.startswith("/") or any(c in value for c in '"\r\n '):
    raise SystemExit("✗ Ungültiger AuthUserFile-Pfad")
tpl = Path("deploy/htaccess.template").read_text()
out = tpl.replace("__AUTH_USER_FILE__", value)
if "__" in out.split("AuthUserFile", 1)[1].split("\n", 1)[0] or "Require valid-user" not in out:
    raise SystemExit("✗ .htaccess-Vorlage fehlerhaft")
Path("dist/.htaccess").write_text(out)
PY
  BUILD_ID="$(python3 -c 'import json;print(json.load(open("dist/version.json"))["buildId"])')"
  [[ "$BUILD_ID" =~ ^[A-Za-z0-9._-]+$ ]] || die "Ungültige Build-ID"
  ok "Build $BUILD_ID sauber"

  # Release lokal archivieren (für Rollback)
  if [ $DRY -eq 0 ]; then
    mkdir -p "$RELEASES_DIR"
    rm -rf "${RELEASES_DIR:?}/$BUILD_ID"; cp -R dist "$RELEASES_DIR/$BUILD_ID"
    ls -1t "$RELEASES_DIR" | grep -v '^\.' | tail -n +$((KEEP_RELEASES+1)) | while read -r old; do rm -rf "${RELEASES_DIR:?}/$old"; done
  fi
  SRC="dist"
fi

# ---------- 4. Ziel auf dem Server prüfen ----------
step "4/6 Ziel prüfen ($SSH_USER@$SSH_HOST:~/$REMOTE_DIR)"
REAL="$(remote "cd ~/$REMOTE_DIR && pwd -P")" || die "SSH-Verbindung oder Zielordner fehlgeschlagen (Host-Key geändert? → nicht ignorieren!)"
[ "$REAL" = "$REMOTE_ABS" ] || die "Zielordner zeigt auf „$REAL“ statt $REMOTE_ABS – Abbruch"
remote "test -f '$AUTH_USER_FILE'" || die "Passwortdatei $AUTH_USER_FILE fehlt auf dem Server – Verzeichnisschutz in cPanel anlegen"
ok "Ziel und Passwortdatei vorhanden"
if [ $DRY -eq 0 ]; then
  mkdir -p "$RELEASES_DIR/.htaccess-backups"
  remote "cat ~/$REMOTE_DIR/.htaccess 2>/dev/null" > "$RELEASES_DIR/.htaccess-backups/$(date +%Y%m%d-%H%M%S).htaccess" || true
  ok "Live-.htaccess gesichert ($RELEASES_DIR/.htaccess-backups/)"
fi

# ---------- 5. Upload ----------
step "5/6 Upload"
RSYNC_COMMON=(-rlptzv --exclude '.DS_Store' -e "$RSYNC_SSH")
[ $DRY -eq 1 ] && RSYNC_COMMON+=(--dry-run)
ENTRY_EXCLUDES=(); for f in $ENTRY_FILES; do ENTRY_EXCLUDES+=(--exclude "$f"); done
ENTRY_SRC=(); for f in $ENTRY_FILES; do [ -f "$SRC/$f" ] && ENTRY_SRC+=("$SRC/$f"); done

echo "  · Stufe 1: .htaccess + Assets (ohne Löschen)"
rsync "${RSYNC_COMMON[@]}" "${ENTRY_EXCLUDES[@]}" "$SRC/" "$TARGET"
echo "  · Stufe 2: Einstiegsdateien"
rsync "${RSYNC_COMMON[@]}" "${ENTRY_SRC[@]}" "$TARGET"

echo "  · Stufe 3: Aufräumen (nicht mehr benutzt + älter als $PRUNE_DAYS Tage)"
KEEP_LIST="$( (cd "$SRC" && find . -type f) | sed 's#^\./##' | sort)"
PRUNE_CMD="keep=\$(mktemp) && sort > \"\$keep\" && cd ~/$REMOTE_DIR && find assets -type f -mtime +$PRUNE_DAYS 2>/dev/null | sort | comm -23 - \"\$keep\"; rm -f \"\$keep\""
CANDIDATES="$(printf '%s\n' "$KEEP_LIST" | remote "bash -c $(printf '%q' "$PRUNE_CMD")" || true)"
if [ -n "$CANDIDATES" ]; then
  printf '%s\n' "$CANDIDATES" | sed 's/^/    - /'
  if [ $DRY -eq 0 ]; then
    printf '%s\n' "$CANDIDATES" | remote "cd ~/$REMOTE_DIR && while IFS= read -r f; do case \"\$f\" in assets/*) rm -f -- \"\$f\" ;; esac; done"
  fi
else
  echo "    (nichts)"
fi

if [ $DRY -eq 1 ]; then
  ok "Probelauf beendet – nichts hochgeladen."
  exit 0
fi

# Zertifikats-Prüfung: nur diese Unterordner ohne Passwort (idempotent, Fehler brechen ab)
for d in $WELL_KNOWN_DIRS; do
  remote "mkdir -p ~/$REMOTE_DIR/.well-known/$d && printf 'Require all granted\n' > ~/$REMOTE_DIR/.well-known/$d/.htaccess" \
    || die "Konnte .well-known/$d nicht einrichten"
done
remote "f=~/$REMOTE_DIR/.well-known/.htaccess; [ ! -f \"\$f\" ] || rm -f \"\$f\"" || die "Alte .well-known/.htaccess nicht entfernbar"

# ---------- 6. Nachprüfung ohne Zugangsdaten ----------
step "6/6 Nachprüfung (ohne Passwort)"
FAIL=0
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1" || true; }
ASSET="$(cd "$SRC" && ls assets/*.js | head -1)"
for p in "/" "/sw.js" "/version.json" "/$ASSET"; do
  c="$(code "https://$PUBLIC_HOST$p")"
  if [ "$c" = "401" ]; then ok "https://$PUBLIC_HOST$p → 401"; else printf '  ✗ https://%s%s → %s (erwartet 401)\n' "$PUBLIC_HOST" "$p" "$c"; FAIL=1; fi
done
H="$(curl -s -D - -o /dev/null --max-time 15 "http://$PUBLIC_HOST/" || true)"
if printf '%s' "$H" | grep -qiE '^HTTP/[0-9.]+ 30[18]' && printf '%s' "$H" | grep -qi "^location: https://$PUBLIC_HOST/" && ! printf '%s' "$H" | grep -qi '^www-authenticate'; then
  ok "http:// → https:// ohne Passwortabfrage"
else
  echo "  ✗ http:// leitet nicht sauber auf https:// um (oder fragt vorher nach dem Passwort):"; printf '%s\n' "$H" | sed 's/^/      /'; FAIL=1
fi
TOKEN="flagos-check-$$"
remote "printf ok > ~/$REMOTE_DIR/.well-known/acme-challenge/$TOKEN"
c="$(code "http://$PUBLIC_HOST/.well-known/acme-challenge/$TOKEN")"
remote "rm -f ~/$REMOTE_DIR/.well-known/acme-challenge/$TOKEN" || true
if [ "$c" = "200" ]; then ok "Zertifikats-Prüfpfad ohne Passwort erreichbar"; else warn "Zertifikats-Prüfpfad liefert $c (erwartet 200) – AutoSSL-Verlängerung könnte scheitern"; fi
c="$(code "https://$PUBLIC_HOST/.well-known/")"
[ "$c" = "401" ] || [ "$c" = "403" ] || [ "$c" = "404" ] && ok ".well-known selbst nicht offen ($c)" || { printf '  ✗ .well-known/ → %s\n' "$c"; FAIL=1; }

if [ $FAIL -ne 0 ]; then
  echo ""
  echo "✗ NACHPRÜFUNG FEHLGESCHLAGEN – die Seite ist evtl. nicht geschützt oder nicht erreichbar."
  echo "  Rollback: npm run deploy -- --rollback   (zeigt die letzten Releases)"
  exit 1
fi
echo "✓ Live: https://$PUBLIC_HOST  (Release ${BUILD_ID:-$ROLLBACK})"
