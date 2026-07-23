"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import type { LeadApiResponse } from "@/lib/leads/types";

const TYPES = [
  { value: "agence", label: "Agence immobilière" },
  { value: "promoteur", label: "Promoteur" },
  { value: "exposant", label: "Exposant / événement" },
] as const;

const ADDONS = [
  { value: "sponsored", label: "Visibilité sponsorisée clairement labellisée" },
  { value: "reporting", label: "Reporting avancé" },
  { value: "sakan_expo", label: "Sakan Expo / événement" },
] as const;

type State = {
  name: string;
  company: string;
  phone: string;
  type: string;
  city: string;
  message: string;
  addons: string[];
  consent: boolean;
};

const INITIAL: State = { name: "", company: "", phone: "", type: "", city: "", message: "", addons: [], consent: false };

export function ProActivationForm() {
  const [form, setForm] = useState<State>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function set<K extends keyof State>(key: K, value: State[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAddon(value: string) {
    set("addons", form.addons.includes(value) ? form.addons.filter((item) => item !== value) : [...form.addons, value]);
  }

  const phoneOk = form.phone.replace(/[\s\-().]/g, "").length >= 8;
  const canSubmit = phoneOk && Boolean(form.company.trim()) && Boolean(form.type) && form.consent && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            project: form.type,
            city: form.city || undefined,
            name: form.name || undefined,
            phone: form.phone,
            message: form.message || undefined,
            consentContact: true,
            consentIndicatif: true,
          },
          professional_request: {
            requestedType: form.type,
            companyName: form.company,
            city: form.city || undefined,
            requestedAddons: form.addons,
          },
          source_channel: "promoter",
          source_page: "/pro",
        }),
      });
      const payload = await response.json() as LeadApiResponse;
      setResult(payload.ok ? { ok: true } : { ok: false, error: payload.error });
    } catch {
      setResult({ ok: false, error: "Connexion impossible au serveur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="contact" className="bg-deepblue py-16 lg:py-20">
      <Container>
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-400">Demande d’activation</p>
            <h2 className="mt-3 text-[1.9rem] font-extrabold tracking-[-0.04em] text-white sm:text-[2.3rem]">Préparer votre intégration AkarFinder Pro</h2>
            <p className="mt-3 text-[14px] leading-6 text-white/65">Cette demande ne crée pas automatiquement une organisation publique. L’activation passe ensuite par l’identification du compte, la validation et l’autorisation des sources.</p>
          </div>

          {result?.ok ? (
            <div className="mt-8 rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-8 text-center">
              <CheckCircle2 size={34} className="mx-auto text-emerald-300" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-extrabold text-white">Demande d’activation enregistrée</h3>
              <p className="mt-2 text-[13.5px] leading-6 text-white/65">Votre société n’est pas encore publiée ni considérée comme partenaire actif. AkarFinder doit d’abord compléter l’onboarding, l’authentification et les validations nécessaires.</p>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/55">Nom<input value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-bronze-500/60" /></label>
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/55">Société *<input value={form.company} onChange={(e) => set("company", e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-bronze-500/60" /></label>
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/55">Téléphone *<input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-bronze-500/60" /></label>
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/55">Profil *<select value={form.type} onChange={(e) => set("type", e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#102744] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-bronze-500/60"><option value="">Sélectionner…</option>{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/55 sm:col-span-2">Ville<input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-bronze-500/60" /></label>
              </div>

              <fieldset className="mt-5">
                <legend className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/55">Options à discuter</legend>
                <div className="mt-3 grid gap-2">
                  {ADDONS.map((addon) => <label key={addon.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12.5px] text-white/75"><input type="checkbox" checked={form.addons.includes(addon.value)} onChange={() => toggleAddon(addon.value)} />{addon.label}</label>)}
                </div>
              </fieldset>

              <label className="mt-5 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/55">Message<textarea rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-bronze-500/60" /></label>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-[12.5px] leading-5 text-white/70"><input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5" /><span>J’accepte d’être recontacté au sujet de l’activation Pro. Je comprends qu’une demande ne crée aucun statut partenaire, badge, publication ou résultat garanti.</span></label>

              {result && !result.ok ? <p className="mt-4 rounded-xl bg-red-500/15 p-4 text-sm font-semibold text-red-200">{result.error}</p> : null}
              <button type="button" disabled={!canSubmit} onClick={submit} className="mt-5 w-full rounded-xl bg-bronze-700 px-6 py-3.5 text-[14px] font-extrabold text-white disabled:opacity-45">{busy ? "Enregistrement…" : "Envoyer ma demande d’activation"}</button>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
