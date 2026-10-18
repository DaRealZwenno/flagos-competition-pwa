// /neu – Wizard: Competition anlegen (Termin, Format, Teams, Auslosung, als Entwurf speichern)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Card, Field, PageTitle, Tag, inputCls, selectCls } from "../components/ui";
import { canCreateCompetition, useAuth } from "../lib/auth";
import { reloadCompetitions, selectCompetition } from "../lib/competitions";
import { createCompetition, fetchDirectoryTeams, fetchOpenEvents, type DirectoryTeamLite, type OpenEvent } from "../services/competitionApi";
import { TEMPLATES, findTemplate } from "../lib/schedule/templates";
import { draw, newSeed, type SeatMap } from "../lib/schedule/draw";
import { buildPlan, refLabel } from "../lib/schedule/plan";
import { buildCreatePayload, type WizardTeam } from "../lib/schedule/payload";
import { seatsOf } from "../lib/schedule/types";
import { fmtDate, fmtTime } from "../lib/format";

type Step = 1 | 2 | 3 | 4;
const STEPS = ["Termin", "Format", "Teams", "Auslosung"];

const uuid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

export default function NewCompetitionPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  // 1 Termin
  const [events, setEvents] = useState<OpenEvent[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("09:00");
  const [place, setPlace] = useState("");
  const [kind, setKind] = useState<"tournament" | "matchday">("tournament");
  const [name, setName] = useState("");

  // 2 Format
  const [teamCount, setTeamCount] = useState(8);
  const [fields, setFields] = useState(1);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [hostParticipates, setHostParticipates] = useState(true);

  // 3 Teams
  const [dir, setDir] = useState<DirectoryTeamLite[]>([]);
  const [search, setSearch] = useState("");
  const [teams, setTeams] = useState<WizardTeam[]>([]);
  const [freeName, setFreeName] = useState("");
  const [hostId, setHostId] = useState("");

  // 4 Auslosung
  const [seed, setSeed] = useState(0);
  const [seats, setSeats] = useState<SeatMap>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    // Termine und Verzeichnis getrennt laden: fällt eines aus, funktioniert das andere trotzdem
    Promise.allSettled([fetchOpenEvents(), fetchDirectoryTeams()]).then(([e, d]) => {
      if (cancelled) return;
      setEvents(e.status === "fulfilled" ? e.value : []);
      if (d.status === "fulfilled") setDir(d.value);
      const failed = [e, d].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (failed) setLoadError(failed.reason instanceof Error ? failed.reason.message : "Fehler");
    });
    return () => { cancelled = true; };
  }, []);

  const template = findTemplate(teamCount, fields);
  const chosenEvent = events?.find((e) => e.id === eventId);
  const startsAt = useMemo(() => {
    const base = mode === "existing" && chosenEvent ? new Date(chosenEvent.date) : new Date(`${date}T${time}`);
    return Number.isNaN(base.getTime()) ? new Date().toISOString() : base.toISOString();
  }, [mode, chosenEvent, date, time]);
  const finalName = (name || (mode === "existing" ? chosenEvent?.title : title) || "").trim();
  const teamNames = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const plan = useMemo(
    () => (template && Object.keys(seats).length ? buildPlan(template, { startsAt, slotMinutes, seats, teamNames }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template, startsAt, slotMinutes, seats, teams],
  );

  if (!auth.ready) return <p className="text-sm text-slate-400">Lädt …</p>;
  if (!auth.email) {
    return (
      <>
        <PageTitle title="Competition anlegen" sub="Bitte zuerst anmelden." />
        <Card><Link to="/konto" className="text-sm font-semibold text-[#C6FF00] underline">Zur Anmeldung</Link></Card>
      </>
    );
  }
  if (!canCreateCompetition(auth)) {
    return (
      <>
        <PageTitle title="Competition anlegen" sub="Dafür fehlt dem Konto das Recht." />
        <Card><p className="text-sm text-slate-300">Competitions legen Plattform-Admins sowie Konten mit der App-Rolle Admin, Coach oder Turnierleiter an.</p></Card>
      </>
    );
  }

  const teamOk = teams.length === teamCount && (!hostParticipates || teams.some((t) => t.id === hostId));
  const step1Ok = mode === "existing" ? !!chosenEvent : !!title.trim() && !!date;
  const canNext = step === 1 ? step1Ok : step === 2 ? !!template : step === 3 ? teamOk : false;

  const addDirectory = (d: DirectoryTeamLite) => {
    if (teams.some((t) => t.directoryTeamId === d.id) || teams.length >= teamCount) return;
    const t: WizardTeam = { id: uuid(), name: d.name, city: d.city || undefined, directoryTeamId: d.id };
    setTeams([...teams, t]);
    if (!hostId) setHostId(t.id);
  };
  const addFree = () => {
    const n = freeName.trim();
    if (!n || teams.length >= teamCount) return;
    const t: WizardTeam = { id: uuid(), name: n };
    setTeams([...teams, t]); setFreeName("");
    if (!hostId) setHostId(t.id);
  };
  const removeTeam = (id: string) => {
    setTeams(teams.filter((t) => t.id !== id));
    if (hostId === id) setHostId("");
  };

  const doDraw = (nextSeed: number) => {
    if (!template) return;
    setSeed(nextSeed);
    setSeats(draw(template, teams.map((t) => t.id), { seed: nextSeed, hostId: hostId || undefined, hostParticipates }));
  };
  const goNext = () => {
    if (step === 3) { doDraw(newSeed()); }
    setStep((step + 1) as Step);
  };
  /** Team auf einen Platz setzen; ist es schon woanders, tauschen die beiden Plätze */
  const setSeat = (seat: string, teamId: string) => {
    const old = Object.entries(seats).find(([, id]) => id === teamId)?.[0];
    const next = { ...seats };
    if (old) next[old] = seats[seat];
    next[seat] = teamId;
    setSeats(next);
  };

  const save = async () => {
    if (!template) return;
    setSaving(true); setSaveError("");
    try {
      const tournamentId = uuid();
      const payload = buildCreatePayload({
        tournamentId, name: finalName, kind,
        eventId: mode === "existing" ? eventId : undefined,
        event: mode === "new" ? { title: title.trim(), date: startsAt, location: place.trim() } : undefined,
        template, plan, seats, teams, hostId: hostId || undefined, hostParticipates, seed, newId: uuid,
      });
      await createCompetition(payload);
      await reloadCompetitions();
      selectCompetition(tournamentId);
      navigate("/");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const shown = dir.filter((d) => (d.name + " " + d.city + " " + d.code).toLowerCase().includes(search.toLowerCase())).slice(0, 40);
  const seatOrder = template ? seatsOf(template) : [];

  return (
    <>
      <PageTitle title="Competition anlegen" sub="Termin wählen, Vorlage und Teams festlegen, auslosen und als Entwurf speichern. Veröffentlicht wird erst danach." />

      <ol className="mb-6 flex flex-wrap gap-2 text-xs font-semibold">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-full border px-3 py-1 ${step === i + 1 ? "border-[#C6FF00]/60 bg-[#C6FF00]/10 text-[#C6FF00]" : step > i + 1 ? "border-white/20 text-slate-300" : "border-white/10 text-slate-500"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {loadError && <p className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">Termine oder Verzeichnis konnten nicht geladen werden ({loadError}). Du kannst trotzdem einen neuen Termin anlegen.</p>}

      {step === 1 && (
        <Card title="1. Termin">
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={mode === "new"} onChange={() => setMode("new")} /> Neuen Termin anlegen</label>
            <label className="flex items-center gap-2"><input type="radio" checked={mode === "existing"} onChange={() => setMode("existing")} disabled={!events?.length} /> Vorhandenen Termin öffnen {events && `(${events.length})`}</label>
          </div>
          {mode === "existing" ? (
            <Field label="Termin aus dem Kalender (ohne Competition)">
              <select className={selectCls} value={eventId} onChange={(e) => { setEventId(e.target.value); setName(""); }}>
                <option value="">Bitte wählen …</option>
                {events?.map((e) => <option key={e.id} value={e.id}>{e.title} · {fmtDate(e.date)} {fmtTime(e.date)}{e.location ? ` · ${e.location}` : ""}</option>)}
              </select>
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Titel"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Donau Bowl V" /></Field>
              <Field label="Ort"><input className={inputCls} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="z. B. Neu-Ulm" /></Field>
              <Field label="Datum"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Beginn des ersten Spiels"><input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Art">
              <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as "tournament" | "matchday")}>
                <option value="tournament">Turnier</option><option value="matchday">Spieltag</option>
              </select>
            </Field>
            <Field label="Name der Competition (leer = Titel des Termins)">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={(mode === "existing" ? chosenEvent?.title : title) || ""} />
            </Field>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="2. Format">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Teams">
              <select className={selectCls} value={teamCount} onChange={(e) => { setTeamCount(Number(e.target.value)); setTeams([]); setHostId(""); }}>
                {[...new Set(TEMPLATES.map((t) => t.teams))].sort().map((n) => <option key={n} value={n}>{n} Teams</option>)}
              </select>
            </Field>
            <Field label="Felder">
              <select className={selectCls} value={fields} onChange={(e) => setFields(Number(e.target.value))}>
                {[...new Set(TEMPLATES.map((t) => t.fields))].sort().map((n) => <option key={n} value={n}>{n} {n === 1 ? "Feld" : "Felder"}</option>)}
              </select>
            </Field>
            <Field label="Slotlänge">
              <select className={selectCls} value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))}>
                {[20, 25, 30, 40, 50, 60, 70].map((m) => <option key={m} value={m}>{m} Minuten</option>)}
              </select>
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hostParticipates} onChange={(e) => setHostParticipates(e.target.checked)} />
            Ausrichter nimmt teil (steht auf Platz A1, erstes Spiel als Heimteam)
          </label>
          {template ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">{template.name} <Tag tone="ok">Vorlage vorhanden</Tag></p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{template.summary.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
              Für {teamCount} Teams auf {fields} {fields === 1 ? "Feld" : "Feldern"} gibt es noch keine Vorlage. Vorhanden: {TEMPLATES.map((t) => `${t.teams} Teams/${t.fields} ${t.fields === 1 ? "Feld" : "Felder"}`).join(", ")}.
            </p>
          )}
        </Card>
      )}

      {step === 3 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`3. Teams (${teams.length} von ${teamCount})`}>
            {teams.length === 0 && <p className="text-sm text-slate-400">Wähle rechts Teams aus dem Verzeichnis oder trage eigene Namen ein.</p>}
            <ul className="divide-y divide-white/10">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{t.name}{t.directoryTeamId && <span className="ml-2 text-xs font-normal text-slate-500">Verzeichnis</span>}</span>
                  {hostParticipates && (
                    <label className="flex items-center gap-1 text-xs text-slate-400"><input type="radio" name="host" checked={hostId === t.id} onChange={() => setHostId(t.id)} /> Ausrichter</label>
                  )}
                  <button type="button" onClick={() => removeTeam(t.id)} className="text-xs text-slate-400 hover:text-red-300" aria-label={`${t.name} entfernen`}>✕</button>
                </li>
              ))}
            </ul>
            {hostParticipates && teams.length === teamCount && !hostId && <p className="mt-3 text-xs text-amber-300">Bitte den Ausrichter markieren.</p>}
          </Card>
          <Card title="Teams hinzufügen">
            <div className="flex gap-2">
              <input className={inputCls} value={freeName} onChange={(e) => setFreeName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFree(); }} placeholder="Eigener Teamname" />
              <Button onClick={addFree} disabled={!freeName.trim() || teams.length >= teamCount}>Hinzufügen</Button>
            </div>
            <input className={`${inputCls} mt-4`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Im Team-Verzeichnis suchen …" />
            <ul className="mt-2 max-h-72 divide-y divide-white/10 overflow-y-auto">
              {shown.map((d) => {
                const added = teams.some((t) => t.directoryTeamId === d.id);
                return (
                  <li key={d.id}>
                    <button type="button" disabled={added || teams.length >= teamCount} onClick={() => addDirectory(d)}
                      className="flex w-full items-center gap-3 py-2 text-left text-sm disabled:opacity-40">
                      <span className="min-w-0 flex-1 truncate">{d.name}</span>
                      <span className="text-xs text-slate-500">{d.city}</span>
                      <span className="text-xs text-[#C6FF00]">{added ? "✓" : "+"}</span>
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="py-3 text-sm text-slate-400">Keine Treffer.</li>}
            </ul>
          </Card>
        </div>
      )}

      {step === 4 && template && (
        <div className="flex flex-col gap-4">
          <Card title="4. Auslosung" actions={<Button onClick={() => doDraw(newSeed())}>Neu auslosen</Button>}>
            <p className="mb-3 text-xs text-slate-400">
              Zufallswert {seed}. Mit demselben Wert kommt immer dieselbe Verteilung heraus.
              {hostParticipates && " Der Ausrichter bleibt auf Platz A1."} Du kannst Teams unten von Hand tauschen.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {seatOrder.map((seat) => (
                <label key={seat} className="flex flex-col gap-1 text-xs font-semibold text-slate-400">
                  Platz {seat}
                  <select className={selectCls} value={seats[seat] ?? ""} onChange={(e) => setSeat(seat, e.target.value)} disabled={hostParticipates && seat === "A1"}>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </Card>
          <Card title="Vorschau Spielplan" hint="Gast links, Heim rechts">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-2">Zeit</th><th>Feld</th><th>Runde</th><th>Gast vs. Heim</th><th>Schiedsrichter</th>
                </tr></thead>
                <tbody>
                  {plan.map((g) => (
                    <tr key={g.id} className="border-t border-white/10">
                      <td className="py-2 text-slate-400">{fmtTime(g.startsAt)}</td>
                      <td className="text-slate-400">{g.field}</td>
                      <td className="text-slate-300">{g.round}</td>
                      <td className="font-semibold">{g.awayLabel} <span className="font-normal text-slate-500">vs.</span> {g.homeLabel}</td>
                      <td className="text-slate-400">{g.officialsTeamId ? g.officialsLabel : g.officials === null ? "Team Officials" : refLabel(g.officials)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">K.-o.-Spiele bekommen ihre Teams nach der Gruppenphase. {fields > 1 && "Bei mehreren Feldern ist die Ergebnis-Freigabe durch die Turnierleitung eingeschaltet."}</p>
          </Card>
          {saveError && <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">{saveError}</p>}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {step > 1 && <Button onClick={() => setStep((step - 1) as Step)} disabled={saving}>Zurück</Button>}
        {step < 4 && <Button variant="primary" onClick={goNext} disabled={!canNext}>Weiter</Button>}
        {step === 4 && <Button variant="primary" onClick={() => void save()} disabled={saving || !finalName}>{saving ? "Wird gespeichert …" : "Als Entwurf speichern"}</Button>}
        <Link to="/" className="ml-auto text-sm text-slate-400 hover:text-slate-200">Abbrechen</Link>
      </div>
    </>
  );
}
