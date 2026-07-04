// DEMO-SHOWCASE-MODE-1 — always-visible "MODE DÉMO" marker.
import { Sparkles } from "lucide-react";

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#60A5FA]/50 bg-[#0B63CE]/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE] ${className}`}
    >
      <Sparkles size={12} strokeWidth={2.4} aria-hidden="true" />
      Mode démo
    </span>
  );
}
