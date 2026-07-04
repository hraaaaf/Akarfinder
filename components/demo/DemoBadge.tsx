// DEMO-SHOWCASE-MODE-1 — always-visible "MODE DÉMO" marker.
import { Sparkles } from "lucide-react";

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#60A5FA]/50 bg-[#0B63CE]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0B63CE] ${className}`}
    >
      <Sparkles size={11} strokeWidth={2.4} aria-hidden="true" />
      Mode démo
    </span>
  );
}
