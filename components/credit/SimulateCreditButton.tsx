"use client";

// CREDIT-UX-1 — Bouton "Simuler le crédit" des cards acheteur.
// Dispatch le prix du bien vers le CreditSimulator (event global) + scroll fluide
// vers la section #financement. Aucun rechargement de page.

import { Calculator } from "lucide-react";

export const SIMULATE_CREDIT_EVENT = "akar:simulate-credit";

export type SimulateCreditDetail = { price: number };

export function SimulateCreditButton({
  price,
  className,
}: {
  price: number;
  className?: string;
}) {
  function handleClick() {
    if (price > 0) {
      window.dispatchEvent(
        new CustomEvent<SimulateCreditDetail>(SIMULATE_CREDIT_EVENT, {
          detail: { price },
        })
      );
    }
    const el = document.getElementById("financement");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "mt-1.5 flex w-full items-center justify-center gap-1.5 text-[11px] font-bold text-gray-500 transition hover:text-bronze-700"
      }
    >
      <Calculator size={11} strokeWidth={2.4} aria-hidden="true" />
      Simuler le crédit
    </button>
  );
}
