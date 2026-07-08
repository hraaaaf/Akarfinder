import Image from "next/image";
import { Ruler, Compass, Layers3 } from "lucide-react";

type DemoFloorPlanCardProps = {
  title: string;
  surface: string;
  rooms: string;
  orientation: string;
  scope: string;
  note?: string;
  imagePath?: string;
};

export function DemoFloorPlanCard({
  title,
  surface,
  rooms,
  orientation,
  scope,
  note = "A confirmer aupres du partenaire.",
  imagePath = "/demo/floorplans/plan-t3-96m2.webp",
}: DemoFloorPlanCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#dbe7f6] bg-white shadow-[0_12px_32px_rgba(15,35,65,0.07)]">
      <div className="relative bg-[#edf5ff] p-4">
        <div className="rounded-lg border border-[#0B63CE]/25 bg-white p-1">
          <Image
            src={imagePath}
            alt={`Plan 2D ${title}`}
            width={400}
            height={500}
            quality={85}
            className="h-auto w-full rounded-md object-contain"
          />
        </div>
        <p className="mt-3 text-center text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">
          Plan 2D fourni par le partenaire — exemple démo
        </p>
        <p className="mt-1 text-center text-[10.5px] text-slate-500">
          À confirmer auprès du partenaire.
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
