"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, GitCompare, Heart, History, Loader2, LogOut, Plus, Search, SlidersHorizontal } from "lucide-react";

type ContinuityState = {
  user: { id: string; email: string | null };
  projects: Array<{ id: string; name: string; status: string; updated_at: string }>;
  favorites: unknown[];
  saved_searches: Array<{ id: string; name: string; alerts_enabled: boolean; status: string }>;
  history: unknown[];
  comparisons: unknown[];
  eliminated: unknown[];
  preferences: unknown[];
};

type AuthMode = "login" | "register";

export function UserContinuityWorkspace() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [state, setState] = useState<ContinuityState | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [projectName, setProjectName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    const response = await fetch("/api/me/continuity", { cache: "no-store" });
    if (!response.ok) {
      setState(null);
      return;
    }
    setState(await response.json() as ContinuityState);
  }, []);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const ok = response.ok;
      setAuthenticated(ok);
      if (ok) await loadState();
      setLoading(false);
    })();
  }, [loadState]);

  async function submitAuth() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json() as { error?: string; confirmation_required?: boolean };
      if (!response.ok) {
        setMessage(mode === "login" ? "Connexion impossible. Vérifiez vos identifiants." : "Création du compte impossible avec ces informations.");
        return;
      }
      if (payload.confirmation_required) {
        setMessage("Compte créé. Vérifiez votre email pour confirmer votre compte avant de vous connecter.");
        setMode("login");
        return;
      }
      setAuthenticated(true);
      setPassword("");
      await loadState();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setState(null);
  }

  async function createProject() {
    const name = projectName.trim();
    if (!name) return;
    setBusy(true);
    const response = await fetch("/api/me/continuity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create_project", name }),
    });
    if (response.ok) {
      setProjectName("");
      await loadState();
    } else {
      setMessage("Impossible de créer ce projet pour le moment.");
    }
    setBusy(false);
  }

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-[#0B63CE]" /></div>;
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
          {(["login", "register"] as const).map((item) => (
            <button key={item} type="button" onClick={() => { setMode(item); setMessage(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-extrabold transition ${mode === item ? "bg-white text-[#071B33] shadow-sm" : "text-slate-500"}`}>
              {item === "login" ? "Se connecter" : "Créer un compte"}
            </button>
          ))}
        </div>
        <label className="block text-sm font-bold text-slate-700">Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" /></label>
        <label className="mt-4 block text-sm font-bold text-slate-700">Mot de passe<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" /></label>
        <p className="mt-2 text-[11px] text-slate-400">8 caractères minimum. La session web est conservée dans des cookies HttpOnly.</p>
        <button type="button" disabled={busy || !email.trim() || password.length < 8} onClick={submitAuth} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}{mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
        {message ? <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-[#084FA8]">{message}</p> : null}
      </div>
    );
  }

  const cards = [
    { label: "Favoris", value: state?.favorites.length ?? 0, icon: Heart },
    { label: "Recherches sauvegardées", value: state?.saved_searches.length ?? 0, icon: Search },
    { label: "Alertes actives", value: state?.saved_searches.filter((item) => item.alerts_enabled && item.status === "active").length ?? 0, icon: Bell },
    { label: "Comparaisons", value: state?.comparisons.length ?? 0, icon: GitCompare },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0B63CE]">Mon espace AkarFinder</p><p className="mt-1 text-sm text-slate-500">{state?.user.email}</p></div>
        <button type="button" onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><LogOut size={15} />Se déconnecter</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon size={18} className="text-[#0B63CE]" /><div className="mt-3 text-2xl font-extrabold text-[#071B33]">{value}</div><div className="mt-1 text-xs font-semibold text-slate-500">{label}</div></div>)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold text-[#071B33]">Mes projets de recherche</h2><p className="mt-1 text-sm text-slate-500">Un profil distinct par projet, sans persona rigide.</p></div><SlidersHorizontal className="text-[#0B63CE]" /></div>
          <div className="mt-5 flex gap-2"><input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex. Résidence familiale Rabat" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#60A5FA]" /><button type="button" disabled={busy || !projectName.trim()} onClick={createProject} className="inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40"><Plus size={16} />Créer</button></div>
          <div className="mt-4 space-y-2">{state?.projects.length ? state.projects.map((project) => <div key={project.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="font-bold text-[#071B33]">{project.name}</div><div className="mt-1 text-xs text-slate-400">{project.status === "active" ? "Actif" : "Archivé"}</div></div>) : <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Aucun projet enregistré pour l'instant.</p>}</div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-[#071B33]">Continuer</h2>
          <div className="mt-4 space-y-3">
            <Link href="/compagnon" className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm font-extrabold text-[#084FA8]">Construire un nouveau projet<span>→</span></Link>
            <Link href="/search" className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-sm font-extrabold text-slate-700">Reprendre une recherche<span>→</span></Link>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500"><History size={17} />{state?.history.length ?? 0} recherches récentes conservées</div>
          </div>
        </section>
      </div>
      {message ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p> : null}
    </div>
  );
}
