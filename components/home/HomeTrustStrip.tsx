import { MapPinned, ShieldCheck, Sparkles } from "lucide-react";

import { Container } from "@/components/ui/Container";

const TRUST_SIGNALS = [
  { icon: Sparkles, title: "Multi-source", detail: "Une recherche, plusieurs sources" },
  { icon: ShieldCheck, title: "Sources visibles", detail: "Origine et fraîcheur quand disponibles" },
  { icon: MapPinned, title: "Marché & quartiers", detail: "Comprendre avant de visiter" },
] as const;

export function HomeTrustStrip() {
  return (
    <section data-home-trust-strip="v1" aria-label="Pourquoi AkarFinder" className="border-b border-[#DFEAF6] bg-white">
      <Container>
        <div className="mx-auto grid max-w-[1050px] gap-0 sm:grid-cols-3">
          {TRUST_SIGNALS.map(({ icon: Icon, title, detail }, index) => (
            <div
              key={title}
              className={`flex min-h-[112px] items-center gap-3 py-5 sm:px-5 ${index > 0 ? "border-t border-[#E6EEF7] sm:border-l sm:border-t-0" : ""}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF6FF] text-[#0B63CE]">
                <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[12.5px] font-extrabold text-[#0B1F3A]">{title}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
