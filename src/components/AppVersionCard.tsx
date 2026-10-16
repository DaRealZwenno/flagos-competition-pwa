// Einstellungen → App-Version: installierte Version, Stand auf dem Server, „Nach Updates suchen“ (aus Broadcast)
import { useEffect, useState } from "react";
import { appVersion, applyUpdate, checkForUpdate, fetchLiveVersion, useUpdateAvailable, type CheckResult, type LiveVersion } from "../lib/pwaUpdate";
import { Button, Card, Tag } from "./ui";

const fmt = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function AppVersionCard() {
  const updateReady = useUpdateAvailable();
  const [state, setState] = useState<"idle" | "checking" | CheckResult>("idle");
  const [live, setLive] = useState<LiveVersion | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void fetchLiveVersion().then((v) => { if (alive) setLive(v); });
    return () => { alive = false; };
  }, []);

  const check = async () => {
    setState("checking");
    const [res, v] = await Promise.all([checkForUpdate(), fetchLiveVersion()]);
    setLive(v);
    setState(res);
  };

  const local = appVersion.commit === "dev" || appVersion.dirty;
  const differs = !!live && !local && live.buildId !== appVersion.buildId;
  const showUpdate = updateReady || state === "update";

  let status: { tone: "ok" | "accent" | "warn" | "muted"; text: string };
  if (showUpdate) status = { tone: "accent", text: "Neue Version bereit" };
  else if (state === "checking") status = { tone: "muted", text: "Wird geprüft …" };
  else if (state === "offline") status = { tone: "warn", text: "Offline – Prüfung nicht möglich" };
  else if (state === "unavailable") status = { tone: "muted", text: "Lokaler Entwicklungsmodus – keine Updates" };
  else if (state === "current") status = differs ? { tone: "warn", text: "Server hat einen anderen Stand – gleich noch mal prüfen" } : { tone: "ok", text: "Aktuell" };
  else status = differs ? { tone: "warn", text: "Neuere Version auf dem Server" } : { tone: "muted", text: "Noch nicht geprüft" };

  return (
    <Card title="App-Version">
      <div className="flex flex-col gap-4" data-testid="app-version">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-slate-400">Installiert</dt>
          <dd className="flex flex-wrap items-center gap-2 text-slate-100">
            <span className="font-mono">v{appVersion.version} · {appVersion.commit}</span>
            <span className="text-slate-400">{fmt(appVersion.builtAt)}</span>
            {local && <Tag tone="warn">lokaler Stand</Tag>}
          </dd>
          <dt className="text-slate-400">Auf dem Server</dt>
          <dd className="flex flex-wrap items-center gap-2 text-slate-100">
            {live === undefined ? <span className="text-slate-400">…</span>
              : live === null ? <span className="text-slate-400">nicht erreichbar</span>
              : <>
                  <span className="font-mono">{live.version ? `v${live.version} · ` : ""}{live.commit}</span>
                  <span className="text-slate-400">{fmt(live.builtAt)}</span>
                </>}
          </dd>
          <dt className="text-slate-400">Status</dt>
          <dd><Tag tone={status.tone}>{status.text}</Tag></dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          {showUpdate
            ? <Button variant="primary" onClick={applyUpdate}>Jetzt aktualisieren</Button>
            : <Button onClick={() => void check()} disabled={state === "checking"}>Nach Updates suchen</Button>}
        </div>
        <p className="text-xs text-slate-400">
          Die App sucht beim Öffnen, beim Zurückwechseln und alle 30 Minuten selbst nach einer neuen Version und zeigt dann unten „Update verfügbar“.
          Eingespielt wird sie erst nach „Neu laden“ bzw. „Jetzt aktualisieren“ – nie mitten in einer Veranstaltung.
          {isStandalone() ? "" : " Tipp: Im Browser-Menü „App installieren“ wählen."}
        </p>
      </div>
    </Card>
  );
}
