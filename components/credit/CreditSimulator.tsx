"use client";

// CREDIT-MVP — Simulateur de mensualité indicatif + lead financement.
// Calcul d'annuité standard, 100 % côté client, aucune donnée transmise sans submit.
// Lead crédit envoyé via POST /api/leads (source_channel="credit").
// Wording obligatoire : "Estimation indicative" · "Non contractuelle" ·
// "À confirmer auprès d'un organisme de financement".
// Aucune promesse de financement, aucun taux garanti, aucun pré-accord.

import { useMemo, useState, type FormEvent } from "react";
import { Calculator, ArrowRight, CheckCircle2, Info, Phone } from "lucide-react";

const CITIES = [
  "Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir",
  "Fès", "Meknès", "Oujda", "Salé", "Témara",
];

const DURATIONS = [10, 15, 20, 25];

type LeadState = {
  name: string;
  phone: string;
  city: string;
  consent: boolean;
};

export type CreditSimulatorProps = {
  /** Page d'origine du lead : "/acheter" ou "/neuf". */
  sourcePage: string;
  /** Prix par défaut affiché dans le simulateur (DH). */
  defaultPrice?: number;
  /** Ancre HTML pour le lien "Simuler le crédit" des cards. */
  id?: string;
};

function formatDH(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${Math.round(n).toLocaleString("fr-FR")} DH`;
}

export function CreditSimulator({ sourcePage, defaultPrice = 1_200_000, id }: CreditSimulatorProps) {
  // ── Paramètres du simulateur ──────────────────────────────────────────────
  const [price, setPrice] = useState<string>(String(defaultPrice));
  const [apport, setApport] = useState<string>(String(Math.round(defaultPrice * 0.2)));
  const [years, setYears] = useState<number>(20);
  const [rate, setRate] = useState<string>("4.5");

  // ── Lead financement ──────────────────────────────────────────────────────
  const [lead, setLead] = useState<LeadState>({ name: "", phone: "", city: "", consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calc = useMemo(() => {
    const p = Number(price) || 0;
    const a = Number(apport) || 0;
    const r = Number(rate) || 0;
    const principal = Math.max(0, p - a);
    const n = years * 12;
    const monthlyRate = r / 100 / 12;

    let monthly = 0;
    if (principal > 0 && n > 0) {
      monthly =
        monthlyRate === 0
          ? principal / n
          : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
    }
    const totalCost = monthly * n;
    const interest = Math.max(0, totalCost - principal);

    return { principal, monthly, totalCost, interest };
  }, [price, apport, years, rate]);

  const phoneNormalized = lead.phone.trim().replace(/[\s\-().]/g, "");
  const phoneOk = phoneNormalized.length >= 8;
  const canSubmit = phoneOk && lead.consent && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const summary = [
      `Prix du bien : ${formatDH(Number(price) || 0)}`,
      `Apport : ${formatDH(Number(apport) || 0)}`,
      `Durée : ${years} ans`,
      `Taux indicatif : ${rate} %`,
      `Mensualité estimée : ${formatDH(calc.monthly)}`,
    ].join(" · ");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            project: "credit",
            name: lead.name.trim() || undefined,
            phone: lead.phone.trim(),
            city: lead.city || undefined,
            budgetTotal: Number(price) || undefined,
            apport: Number(apport) || undefined,
            needsCredit: true,
            message: `[Financement] ${summary}`,
            consentContact: true,
            consentIndicatif: true,
          },
          source_channel: "credit",
          source_page: sourcePage,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
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

  return (
    <div
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] shadow-[0_14px_40px_rgba(2,10,24,0.3)] backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bronze-500/20 text-bronze-300 ring-1 ring-bronze-500/30">
          <Calculator size={16} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[13.5px] font-extrabold text-white">Simuler mon financement</p>
          <p className="text-[11px] text-white/45">Estimation indicative · non contractuelle</p>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* ── Paramètres ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="credit-price" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
              Prix du bien (DH)
            </label>
            <input
              id="credit-price"
              type="number"
              min={0}
              step={50000}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
            />
          </div>
          <div>
            <label htmlFor="credit-apport" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
              Apport (DH)
            </label>
            <input
              id="credit-apport"
              type="number"
              min={0}
              step={10000}
              value={apport}
              onChange={(e) => setApport(e.target.value)}
              className="w-full rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
            />
          </div>
          <div>
            <label htmlFor="credit-years" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
              Durée (ans)
            </label>
            <select
              id="credit-years"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full rounded-xl border border-white/12 bg-[#061027] px-3 py-2.5 text-[13px] text-white/85 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} ans</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="credit-rate" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
              Taux indicatif (%)
            </label>
            <input
              id="credit-rate"
              type="number"
              min={0}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
            />
          </div>
        </div>

        {/* ── Résultats ───────────────────────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-bronze-500/25 bg-gradient-to-br from-bronze-500/[0.16] to-bronze-500/[0.03] p-4">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-bronze-400">
            Mensualité estimée
          </p>
          <p className="mt-1 text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white">
            {formatDH(calc.monthly)}
            <span className="ml-1.5 text-[12px] font-bold text-white/40">/ mois</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-bronze-500/20 pt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">Montant financé</p>
              <p className="mt-0.5 text-[13px] font-extrabold text-white/90">{formatDH(calc.principal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">Coût total indicatif</p>
              <p className="mt-0.5 text-[13px] font-extrabold text-white/90">{formatDH(calc.totalCost)}</p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-4 text-white/45">
            <Info size={11} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
            Estimation indicative et non contractuelle. À confirmer auprès d&apos;un organisme de financement.
          </p>
        </div>

        {/* ── Lead financement ────────────────────────────────────────────── */}
        {success ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-5 py-6 text-center">
            <CheckCircle2 size={30} className="text-emerald-400" aria-hidden="true" />
            <p className="mt-3 text-[14px] font-extrabold text-white">Demande enregistrée</p>
            <p className="mt-2 text-[12px] leading-5 text-white/60">
              Vous serez recontacté selon disponibilité pour échanger sur votre financement.
            </p>
            <p className="mt-2 text-[10.5px] text-white/35">
              Non contractuel · à confirmer auprès d&apos;un organisme de financement.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-bronze-400" aria-hidden="true" />
              <p className="text-[12.5px] font-extrabold text-white">Être rappelé pour mon financement</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="credit-name" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
                  Nom <span className="font-normal normal-case text-white/30">(optionnel)</span>
                </label>
                <input
                  id="credit-name"
                  type="text"
                  value={lead.name}
                  onChange={(e) => setLead((l) => ({ ...l, name: e.target.value }))}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="credit-city" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
                  Ville <span className="font-normal normal-case text-white/30">(optionnel)</span>
                </label>
                <select
                  id="credit-city"
                  value={lead.city}
                  onChange={(e) => setLead((l) => ({ ...l, city: e.target.value }))}
                  className="w-full rounded-xl border border-white/12 bg-[#061027] px-3 py-2.5 text-[13px] text-white/85 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
                >
                  <option value="">—</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="credit-phone" className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-white/50">
                Téléphone / WhatsApp <span className="text-bronze-400">*</span>
              </label>
              <input
                id="credit-phone"
                type="tel"
                placeholder="+212 6..."
                value={lead.phone}
                onChange={(e) => setLead((l) => ({ ...l, phone: e.target.value }))}
                className="w-full rounded-xl border border-white/12 bg-white/[0.07] px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-bronze-400/60 focus:ring-1 focus:ring-bronze-400/30"
                autoComplete="tel"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={lead.consent}
                onChange={(e) => setLead((l) => ({ ...l, consent: e.target.checked }))}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-bronze-400"
              />
              <span className="text-[11px] leading-4 text-white/50">
                J&apos;accepte d&apos;être recontacté au sujet de mon financement.{" "}
                <span className="text-white/30">Non contractuel · estimation indicative.</span>
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
              {submitting ? "Envoi..." : "Être rappelé pour mon financement"}
              {!submitting && <ArrowRight size={13} strokeWidth={2.4} aria-hidden="true" />}
            </button>
          </form>
        )}
      </div>

      <div className="border-t border-white/8 bg-white/[0.02] px-5 py-3">
        <p className="text-[10.5px] leading-4 text-white/35">
          Estimation indicative et non contractuelle — hors assurance et frais.
          À confirmer auprès d&apos;un organisme de financement. AkarFinder ne fournit pas de conseil financier.
        </p>
      </div>
    </div>
  );
}
