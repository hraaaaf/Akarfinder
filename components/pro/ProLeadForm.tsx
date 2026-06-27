"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import type { LeadApiResponse } from "@/lib/leads/types";

// PROMOTER-MVP — Pro access lead form. Posts to the existing /api/leads endpoint
// with source_channel="promoter". No schema migration: société is composed into the
// message field; the selected type (agence/promoteur/exposant) is stored in project_type.
// Wording: liste d'attente / offre pilote — pas de leads garantis ni résultat garanti.

const TYPES = [
  { value: "agence", label: "Agence" },
  { value: "promoteur", label: "Promoteur" },
  { value: "exposant", label: "Exposant Sakan Expo" },
] as const;

type ProState = {
  name: string;
  societe: string;
  phone: string;
  type: string;
  city: string;
  message: string;
  consent: boolean;
};

const INITIAL: ProState = {
  name: "",
  societe: "",
  phone: "",
  type: "",
  city: "",
  message: "",
  consent: false,
};

export function ProLeadForm() {
  const [form, setForm] = useState<ProState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: true } | { ok: false; error: string } | null>(null);

  function set<K extends keyof ProState>(key: K, value: ProState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const phoneOk = form.phone.replace(/[\s\-().]/g, "").length >= 8;
  const canSubmit = phoneOk && !!form.type && form.consent && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const composedMessage = [
        form.societe ? `Société : ${form.societe}` : null,
        form.message || null,
      ]
        .filter(Boolean)
        .join(" — ");

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            project: form.type, // agence / promoteur / exposant → project_type
            city: form.city || undefined,
            name: form.name || undefined,
            phone: form.phone,
            message: composedMessage || undefined,
            consentContact: true,
            consentIndicatif: true,
          },
          source_channel: "promoter",
          source_page: "/pro",
        }),
      });
      const data: LeadApiResponse = await res.json();
      if (data.ok) setResult({ ok: true });
      else setResult({ ok: false, error: data.error });
    } catch {
      setResult({ ok: false, error: "Connexion impossible au serveur." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="contact" className="bg-deepblue py-16 lg:py-20">
      <Container>
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-400">
              Accès Pro
            </p>
            <h2 className="mt-3 text-[1.8rem] font-extrabold tracking-[-0.04em] text-white sm:text-[2.2rem]">
              Demander un accès Pro
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-white/65">
              Offre pilote en cours de lancement. Remplissez ce formulaire pour rejoindre la liste
              d&apos;attente et être contacté en priorité.
            </p>
          </div>

          {result?.ok ? (
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                <CheckCircle2 size={28} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-[1.4rem] font-extrabold tracking-[-0.03em] text-white">
                Demande envoyée
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-white/65">
                Merci. Votre demande d&apos;accès Pro a bien été enregistrée. Offre pilote — vous
                serez recontacté en priorité. Aucun résultat n&apos;est garanti pendant la phase de
                lancement.
              </p>
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-7 backdrop-blur-sm sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pro-nom" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-white/60">
                    Nom
                  </label>
                  <input
                    id="pro-nom"
                    type="text"
                    placeholder="Votre nom"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-bronze-500/60 focus:ring-2 focus:ring-bronze-500/15 transition"
                  />
                </div>
                <div>
                  <label htmlFor="pro-societe" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-white/60">
                    Société
                  </label>
                  <input
                    id="pro-societe"
                    type="text"
                    placeholder="Nom de votre agence ou société"
                    value={form.societe}
                    onChange={(e) => set("societe", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-bronze-500/60 focus:ring-2 focus:ring-bronze-500/15 transition"
                  />
                </div>
                <div>
                  <label htmlFor="pro-tel" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-white/60">
                    Téléphone / WhatsApp
                  </label>
                  <input
                    id="pro-tel"
                    type="tel"
                    placeholder="+212 6XX XXX XXX"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-bronze-500/60 focus:ring-2 focus:ring-bronze-500/15 transition"
                  />
                </div>
                <div>
                  <label htmlFor="pro-type" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-white/60">
                    Type de projet
                  </label>
                  <select
                    id="pro-type"
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-[14px] text-white outline-none focus:border-bronze-500/60 focus:ring-2 focus:ring-bronze-500/15 transition"
                  >
                    <option value="" className="text-gray-800">Agence / Promoteur / Exposant</option>
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="text-gray-800">{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pro-ville" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-white/60">
                    Ville
                  </label>
                  <input
                    id="pro-ville"
                    type="text"
                    placeholder="Casablanca, Rabat..."
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-bronze-500/60 focus:ring-2 focus:ring-bronze-500/15 transition"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="pro-message" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-white/60">
                    Message
                  </label>
                  <textarea
                    id="pro-message"
                    rows={3}
                    placeholder="Nombre de biens, type de projet, besoins spécifiques..."
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    className="mt-1.5 w-full resize-none rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-bronze-500/60 focus:ring-2 focus:ring-bronze-500/15 transition"
                  />
                </div>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-white/30 accent-bronze-500"
                  checked={form.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                />
                <span className="text-[12.5px] leading-5 text-white/70">
                  J&apos;accepte d&apos;être recontacté au sujet de l&apos;offre Pro. Je comprends qu&apos;il
                  s&apos;agit d&apos;une offre pilote et qu&apos;aucun résultat ni volume de leads n&apos;est garanti.
                </span>
              </label>

              {result && !result.ok ? (
                <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-[13px] font-semibold text-red-200">
                  {result.error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="mt-5 w-full rounded-xl bg-bronze-700 px-6 py-3.5 text-[15px] font-extrabold text-white shadow-[0_8px_22px_rgba(155,120,56,0.38)] transition hover:bg-bronze-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-bronze-700/50 disabled:text-white/60 disabled:shadow-none"
              >
                {submitting ? "Envoi en cours…" : "Demander un accès Pro"}
              </button>

              <p className="mt-4 text-center text-[12.5px] leading-5 text-white/40">
                Offre pilote en préparation. Demande indicative — vous serez recontacté en priorité.
              </p>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
