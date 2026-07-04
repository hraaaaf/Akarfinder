import { Ruler, Compass, Layers3 } from "lucide-react";
import { DemoBadge } from "./DemoBadge";

type DemoFloorPlanCardProps = {
  title: string;
  surface: string;
  rooms: string;
  orientation: string;
  scope: string;
  note?: string;
};

export function DemoFloorPlanCard({
  title,
  surface,
  rooms,
  orientation,
  scope,
  note = "A confirmer aupres du partenaire.",
}: DemoFloorPlanCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#dbe7f6] bg-white shadow-[0_12px_32px_rgba(15,35,65,0.07)]">
      <div className="relative bg-[#edf5ff] p-4">
        <DemoBadge className="absolute left-3 top-3" />
        <div className="mt-7 grid h-44 grid-cols-[1.1fr_0.9fr] gap-2 rounded-xl border border-[#0B63CE]/25 bg-white p-3">
          <div className="rounded-lg border-2 border-[#0B63CE]/35 bg-[#f8fbff] p-2">
            <div className="h-full rounded-md border border-dashed border-[#0B63CE]/30 bg-white/80 p-2">
              <div className="h-2/5 rounded border border-[#0B63CE]/25 bg-[#dbeafe]" />
              <div className="mt-2 grid h-[calc(60%-0.5rem)] grid-cols-2 gap-2">
                <div className="rounded border border-[#0B63CE]/25 bg-[#eff6ff]" />
                <div className="rounded border border-[#0B63CE]/25 bg-[#eff6ff]" />
              </div>
            </div>
          </div>
          <div className="grid grid-rows-2 gap-2">
            <div className="rounded-lg border border-[#0B63CE]/25 bg-white" />
            <div className="rounded-lg border border-[#0B63CE]/25 bg-white" />
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">
          Plan 2D fourni par le partenaire - exemple demo
        </p>
      </div>
      <div className="p-5">
        <h3 className="text-[15px] font-extrabold text-[#0B1F3A]">{title}</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
            <Ruler size={13} className="text-[#0B63CE]" aria-hidden="true" />
            {surface}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
            <Layers3 size={13} className="text-[#0B63CE]" aria-hidden="true" />
            {rooms}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
            <Compass size={13} className="text-[#0B63CE]" aria-hidden="true" />
            {orientation}
          </span>
          <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{scope}</span>
        </div>
        <p className="mt-3 text-[11.5px] leading-5 text-slate-500">{note}</p>
      </div>
    </article>
  );
}
