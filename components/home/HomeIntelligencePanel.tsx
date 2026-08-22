import Link from "next/link";
import { ArrowRight, BarChart3, Layers3, MapPinned, ShieldCheck } from "lucide-react";

const SIGNALS = [
  {
    icon: BarChart3,
    label: "Comparer",
    detail: "Prix et offres visibles dans les résultats",
  },
  {
    icon: Layers3,
    label: "Explorer",
    detail: "Villes, quartiers et programmes réunis",
  },
  {
    icon: ShieldCheck,
    label: "Vérifier",
    detail: "Source et fraîcheur affichées quand disponibles",
  },
] as const;

export function HomeIntelligencePanel() {
  return (
    <aside
      data-home-intelligence="hvr-1"
      aria-label="AkarFinder Intelligence"
      className="overflow-hidden rounded-[24px] border border-white/16 bg-[#071F3D] text-white shadow-[0_22px_70px_rgba(1,10,25,0.34)]"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0B63CE]/24 text-blue-200">
          <BarChart3 size={19} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-white sm:text-[16px]">
            AkarFinder Intelligence
          </h2>
          <p className="mt-0.5 text-[11px] font-medium text-blue-100/72">
            Lire le marché avant de décider.
          </p>
        </div>
      </div>

      <div className="divide-y divide-white/9 px-5 sm:px-6">
        {SIGNALS.map(({ icon: Icon, label, detail }) => (
          <div key={label} className="grid grid-cols-[34px_1fr] gap-3 py-3.5">
            <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-white/[0.07] text-blue-200">
              <Icon size={16} strokeWidth={2.1} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-extrabold text-white">{label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-blue-50/72">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden border-t border-white/10 bg-[#0A2B52] px-5 py-4 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(191,219,254,0.35) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <Link
          href="/map"
          className="relative flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.07] px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60"
        >
          <span className="flex items-center gap-2">
            <MapPinned size={17} strokeWidth={2.2} aria-hidden="true" />
            Explorer le marché sur la carte
          </span>
          <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
