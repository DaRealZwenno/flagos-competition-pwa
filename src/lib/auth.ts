// Anmeldung über das FlagOS-Konto (Supabase Auth, gleiches Projekt wie Broadcast und Stadium).
// Die Competition-Seiten sind ohne Anmeldung nutzbar; das Konto braucht man für den Admin-Bereich
// und später für Rollen pro Competition (Turnierleitung, Feldleitung, Team-Vertretung).
import { useSyncExternalStore } from "react";
import { supabase } from "../services/supabaseClient";

export type AuthState = { ready: boolean; email: string | null; isAdmin: boolean };

let state: AuthState = { ready: false, email: null, isAdmin: false };
const listeners = new Set<() => void>();
const set = (next: AuthState) => { state = next; listeners.forEach((l) => l()); };

/** Sitzung und Plattform-Admin-Recht neu lesen */
export async function refreshAuth(): Promise<AuthState> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { set({ ready: true, email: null, isAdmin: false }); return state; }
  const { data } = await supabase.rpc("is_platform_admin");
  set({ ready: true, email: session.user.email ?? "", isAdmin: !!data });
  return state;
}

let started = false;
export function startAuth() {
  if (started) return;
  started = true;
  void refreshAuth();
  supabase.auth.onAuthStateChange(() => void refreshAuth());
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? authErrorText(error.message) : null;
}

export async function resetPassword(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/konto` });
  return error ? authErrorText(error.message) : null;
}

export async function signOut() { await supabase.auth.signOut(); }

/** Supabase-Fehlermeldungen verständlich auf Deutsch */
export function authErrorText(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "E-Mail oder Passwort ist falsch.";
  if (/email not confirmed/i.test(msg)) return "Die E-Mail-Adresse ist noch nicht bestätigt.";
  if (/rate limit|too many/i.test(msg)) return "Zu viele Versuche – bitte kurz warten.";
  if (/fetch|network/i.test(msg)) return "Keine Verbindung zum Server. Ohne Internet ist keine Anmeldung möglich.";
  return msg;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useAuth = () => useSyncExternalStore(subscribe, () => state, () => state);
