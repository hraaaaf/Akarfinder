"use client";

import { useMemo, useState } from "react";
import { FINANCE_MAROC_DISCLAIMER, simulateFinanceMaroc } from "@/lib/property-detail/finance-maroc";

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMad(value: number): string {
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(value)} DH`;
}

export function FinanceMarocSection({ propertyPriceMad }: { propertyPriceMad?: number | null }) {
  const [downPayment, setDownPayment] = useState("0");
  const [annualRate, setAnnualRate] = useState("");
  const [durationYears, setDurationYears] = useState("20");

  const result = useMemo(() => {
    if (!propertyPriceMad || propertyPriceMad <= 0) return null;
    const parsedDownPayment = parseNumber(downPayment);
    const parsedAnnualRate = parseNumber(annualRate);
    const parsedDuration = parseNumber(durationYears);
    if (parsedDownPayment === null || parsedAnnualRate === null || parsedDuration === null) return null;

    return simulateFinanceMaroc({
      propertyPriceMad,
      downPaymentMad: parsedDownPayment,
      annualRatePct: parsedAnnualRate,
      durationYears: parsedDuration,
      assumptionsVersion: "user-input-v1",
      assumptionsObservedAt: "2026-08-16T00:00:00.000Z",
    });
  }, [annualRate, downPayment, durationYears, propertyPriceMad]);

  if (!propertyPriceMad || propertyPriceMad <= 0) return null;

  return (
    <section data-finance-maroc="ann-l10" className="border-b border-slate-200 py-6">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#0B63CE]">Finance Maroc</p>
      <h2 className="mt-1 text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">Simuler votre financement</h2>
      <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-slate-500">
        Saisissez vos propres hypothèses. Aucun taux bancaire ni frais d’acquisition n’est présumé par AkarFinder.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-[11px] font-bold text-slate-600">
          Apport (DH)
          <input aria-label="Apport en dirhams" inputMode="decimal" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-[14px] text-deepblue outline-none focus:border-[#0B63CE]" />
        </label>
        <label className="grid gap-1.5 text-[11px] font-bold text-slate-600">
          Taux annuel (%)
          <input aria-label="Taux annuel en pourcentage" inputMode="decimal" placeholder="À saisir" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-[14px] text-deepblue outline-none focus:border-[#0B63CE]" />
        </label>
        <label className="grid gap-1.5 text-[11px] font-bold text-slate-600">
          Durée (années)
          <input aria-label="Durée en années" inputMode="numeric" value={durationYears} onChange={(event) => setDurationYears(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-[14px] text-deepblue outline-none focus:border-[#0B63CE]" />
        </label>
      </div>

      {result ? (
        <dl className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Montant financé</dt><dd className="mt-1 text-[15px] font-extrabold text-deepblue">{formatMad(result.financedPrincipalMad)}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Mensualité</dt><dd className="mt-1 text-[15px] font-extrabold text-deepblue">{formatMad(result.monthlyPaymentMad)}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total remboursé</dt><dd className="mt-1 text-[15px] font-extrabold text-deepblue">{formatMad(result.totalPaymentsMad)}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Intérêts simulés</dt><dd className="mt-1 text-[15px] font-extrabold text-deepblue">{formatMad(result.totalInterestMad)}</dd></div>
        </dl>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-[12px] text-slate-500">Renseignez un taux annuel valide pour calculer la simulation.</p>
      )}

      <p className="mt-3 text-[10.5px] leading-4 text-slate-400">{FINANCE_MAROC_DISCLAIMER}</p>
    </section>
  );
}
