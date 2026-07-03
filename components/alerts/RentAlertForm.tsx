"use client";

// P18A — Formulaire d'alerte location.
// Sidebar dark (bg-[#061027]). POST vers /api/alerts.
// Wording prudent : aucune promesse d'alerte instantanée garantie.

import { useState, type FormEvent } from "react";
import { Bell, ArrowRight, CheckCircle2 } from "lucide-react";

type FormState = {
  phone: string;
  city: string;
  budget_max: string;
  property_type: string;
  consent: boolean;
};

const CITIES = [
  "Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir",
  "Fès", "Meknès", "Oujda", "Salé", "Témara",
];

const PROPERTY_TYPES = ["Studio", "Appartement", "Villa", "Bureau"];

export function RentAlertForm() {
  const [form, setForm] = useState<FormState>({
    phone: "",
    city: "",
    budget_max: "",
    property_type: "",
    consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneNormalized = form.phone.trim().replace(/[\s\-().]/g, "");
  const phoneOk = phoneNormalized.length >= 8;
  const canSubmit = phoneOk && form.consent && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone.trim() || undefined,
          city: form.city || undefined,
          budget_max: form.budget_max ? Number(form.budget_max) : undefined,
          property_type: form.property_type || undefined,
          transaction_type: "rent",
          consent: true,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Erreur. Veuillez réessayer.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="overflow-hidden rounded-2xl border border-bronze-500/25 bg-gradient-to-br from-bronze-500/[0.14] to-bronze-500/[0.03] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">
        <div className="flex flex-col items-center px-5 py-7 text-center">
          <CheckCircle2 size={32} className="text-emerald-400" aria-hidden="true" />
          <p className="mt-3 text-[14px] font-extrabold text-white">Alerte enregistrée</p>
          <p className="mt-2 text-[12px] leading-5 text-white/60">
            Vous serez recontacté selon disponibilité.
          </p>
          <p className="mt-2 text-[10.5px] text-white/35">
            Non contractuel · repères indicatifs · à confirmer avant décision.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-bronze-500/25 bg-gradient-to-br from-bronze-500/[0.14] to-bronze-500/[0.03] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-sm">

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-bronze-500/20 px-5 py-4">
        <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bronze-500/20 text-bronze-300 ring-1 ring-bronze-500/30">
          <Bell size={16} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[13.5px] font-extrabold text-bronze-100">Alerte location</p>
          <p className="text-[11px] text-white/45">Soyez informé selon disponibilité</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3 px-5 py-4">

        {/* Phone */}
        <div>
          <label htmlFor="alert-phone" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
            Téléphone / WhatsApp <span className="text-bronze-400">*</span>
          </label>
          <input
            id="alert-phone"
            type="tel"
            placeholder="+212 6..."
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-xl border border-white/12 bg-white/[0.07] px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
            autoComplete="tel"
          />
        </div>

        {/* Ville */}
        <div>
          <label htmlFor="alert-city" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
            Ville{" "}
            <span className="font-normal normal-case text-white/30">(optionnel)</span>
          </label>
          <select
            id="alert-city"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="w-full rounded-xl border border-white/12 bg-[#061027] px-3.5 py-2.5 text-[13px] text-white/85 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
          >
            <option value="">Toutes les villes</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Budget max */}
        <div>
          <label htmlFor="alert-budget" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
            Budget max DH/mois{" "}
            <span className="font-normal normal-case text-white/30">(optionnel)</span>
          </label>
          <input
            id="alert-budget"
            type="number"
            placeholder="Ex : 8 000"
            min={0}
            step={500}
            value={form.budget_max}
            onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value }))}
            className="w-full rounded-xl border border-white/12 bg-white/[0.07] px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
          />
        </div>

        {/* Type de bien */}
        <div>
          <label htmlFor="alert-type" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
            Type de bien{" "}
            <span className="font-normal normal-case text-white/30">(optionnel)</span>
          </label>
          <select
            id="alert-type"
            value={form.property_type}
            onChange={(e) => setForm((f) => ({ ...f, property_type: e.target.value }))}
            className="w-full rounded-xl border border-white/12 bg-[#061027] px-3.5 py-2.5 text-[13px] text-white/85 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
          >
            <option value="">Tous les types</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Consentement */}
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-bronze-400"
          />
          <span className="text-[11px] leading-4 text-white/50">
            J&apos;accepte d&apos;être recontacté selon disponibilité.{" "}
            <span className="text-white/30">Non contractuel · repères indicatifs.</span>
          </span>
        </label>

        {error ? (
          <p className="text-[12px] text-red-400" role="alert">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-[0_4px_14px_rgba(155,120,56,0.35)] transition hover:from-bronze-600 hover:to-bronze-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Enregistrement..." : "Créer mon alerte"}
          {!submitting && (
            <ArrowRight size={13} strokeWidth={2.4} aria-hidden="true" />
          )}
        </button>
      </form>

      <div className="border-t border-bronze-500/20 bg-bronze-500/[0.06] px-5 py-3">
        <p className="text-[10.5px] text-white/35">
          Alerte indicative — basée sur les résultats disponibles.
          Pas d&apos;alerte automatique garantie.
        </p>
      </div>
    </div>
  );
}
