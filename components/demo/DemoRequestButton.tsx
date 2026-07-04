"use client";

// DEMO-SHOWCASE-MODE-1 — visual-only CTA, no backend call, no lead storage.
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type DemoRequestButtonProps = {
  label?: string;
  className?: string;
};

export function DemoRequestButton({
  label = "Demander une démonstration",
  className = "",
}: DemoRequestButtonProps) {
  const [clicked, setClicked] = useState(false);

  if (clicked) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-[13.5px] font-extrabold text-emerald-700 ${className}`}
      >
        <CheckCircle2 size={16} aria-hidden="true" />
        Exemple non contractuel — aucune demande réelle envoyée
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setClicked(true)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(11,99,206,0.35)] transition hover:bg-[#084BA8] ${className}`}
    >
      {label}
      <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}
