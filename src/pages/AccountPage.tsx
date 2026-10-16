// /konto – Anmeldung mit dem FlagOS-Konto
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { resetPassword, signIn, signOut, useAuth } from "../lib/auth";
import { Button, Card, Field, PageTitle, inputCls } from "../components/ui";

export default function AccountPage() {
  const { ready, email: userEmail, isAdmin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setMsg({ text: err }); else nav("/");
  };
  const reset = async () => {
    if (!email.trim()) { setMsg({ text: "Bitte zuerst die E-Mail-Adresse eintragen." }); return; }
    setBusy(true);
    const err = await resetPassword(email);
    setBusy(false);
    setMsg(err ? { text: err } : { text: "Falls ein Konto existiert, ist eine E-Mail zum Zurücksetzen unterwegs.", ok: true });
  };

  return (
    <div className="mx-auto max-w-md">
      <PageTitle title={userEmail ? "Dein Konto" : "Anmelden"} sub="Mit deinem FlagOS-Konto. Competition ist ohne Anmeldung nutzbar; das Konto brauchst du für den Admin-Bereich und später für Rollen in einer Competition (Turnierleitung, Feldleitung, Team-Vertretung)." />
      {ready && userEmail && (
        <Card title="Angemeldet">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#C6FF00] text-lg font-black text-[#06111f]">{(userEmail[0] || "?").toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate font-semibold">{userEmail}</p><p className="text-xs text-slate-400">FlagOS-Konto{isAdmin ? " · Plattform-Admin" : ""}</p></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {isAdmin && <Link to="/admin" className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold hover:border-white/35">Admin-Bereich</Link>}
            <Button onClick={() => void signOut()}>Abmelden</Button>
          </div>
        </Card>
      )}
      {ready && !userEmail && (
        <Card>
          <form onSubmit={login} className="flex flex-col gap-4">
            <Field label="E-Mail"><input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
            <Field label="Passwort"><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} /></Field>
            {msg && <p className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-emerald-400/40 text-emerald-300" : "border-red-400/40 text-red-300"}`}>{msg.text}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" type="submit" disabled={busy}>{busy ? "Wird geprüft …" : "Anmelden"}</Button>
              <button type="button" onClick={() => void reset()} className="text-xs text-slate-400 underline hover:text-slate-200">Passwort vergessen?</button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
