import { CalendarDays } from "lucide-react";
import { DemoBadge } from "./DemoBadge";

type DemoProjectPhaseTimelineProps = {
  phases: Array<{
    name: string;
    status: string;
    delivery: string;
    note: string;
  }>;
};

export function DemoProjectPhaseTimeline({ phases }: DemoProjectPhaseTimelineProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {phases.map((phase, index) => (
        <article key={phase.name} className="relative rounded-2xl border border-[#dbe7f6] bg-white p-5 shadow-[0_10px_28px_rgba(15,35,65,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-grid h-9 w-9 place-items-center rounded-xl bg-[#0B63CE] text-[13px] font-extrabold text-white">
              {index + 1}
            </span>
            <DemoBadge />
          </div>
          <h3 className="mt-4 text-[15px] font-extrabold text-[#0B1F3A]">{phase.name}</h3>
          <p className="mt-1 text-[12px] font-bold text-[#0B63CE]">{phase.status}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
            <CalendarDays size={13} aria-hidden="true" />
            {phase.delivery}
          </p>
          <p className="mt-3 text-[12px] leading-5 text-slate-500">{phase.note}</p>
        </article>
      ))}
    </div>
  );
}
