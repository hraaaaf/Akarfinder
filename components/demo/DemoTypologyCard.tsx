import { Bath, Bed, Car, Ruler, Trees } from "lucide-react";
import { DemoRequestButton } from "./DemoRequestButton";

type DemoTypologyCardProps = {
  name: string;
  surface: string;
  bedrooms: string;
  bathrooms: string;
  orientation: string;
  parking: string;
  terrace: string;
  price: string;
  availability: string;
};

export function DemoTypologyCard({
  name,
  surface,
  bedrooms,
  bathrooms,
  orientation,
  parking,
  terrace,
  price,
  availability,
}: DemoTypologyCardProps) {
  return (
    <article className="rounded-2xl border border-[#dbe7f6] bg-white p-5 shadow-[0_10px_28px_rgba(15,35,65,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-extrabold text-[#0B1F3A]">{name}</h3>
          <p className="mt-1 text-[12px] font-bold text-[#0B63CE]">{availability}</p>
        </div>
        <p className="rounded-full bg-[#0B63CE]/10 px-3 py-1 text-[11px] font-extrabold text-[#0B63CE]">
          {price}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[12px] text-slate-600">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
          <Ruler size={13} className="text-[#0B63CE]" aria-hidden="true" />
          {surface}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
          <Bed size={13} className="text-[#0B63CE]" aria-hidden="true" />
          {bedrooms}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
          <Bath size={13} className="text-[#0B63CE]" aria-hidden="true" />
          {bathrooms}
        </span>
        <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{orientation}</span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
          <Car size={13} className="text-[#0B63CE]" aria-hidden="true" />
          {parking}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
          <Trees size={13} className="text-[#0B63CE]" aria-hidden="true" />
          {terrace}
        </span>
      </div>
      <DemoRequestButton label="Demander les details" className="mt-4 w-full" />
    </article>
  );
}
