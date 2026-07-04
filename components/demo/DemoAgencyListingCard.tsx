import { MapPin, Ruler } from "lucide-react";
import { DemoBadge } from "./DemoBadge";
import { DemoRequestButton } from "./DemoRequestButton";

type DemoAgencyListingCardProps = {
  title: string;
  city: string;
  neighborhood: string;
  propertyType: string;
  transaction: string;
  price: string;
  surface: string;
  locationLevel: string;
  contactMode: string;
  pointsToVerify: string[];
};

export function DemoAgencyListingCard({
  title,
  city,
  neighborhood,
  propertyType,
  transaction,
  price,
  surface,
  locationLevel,
  contactMode,
  pointsToVerify,
}: DemoAgencyListingCardProps) {
  return (
    <article className="rounded-2xl border border-[#dbe7f6] bg-white p-5 shadow-[0_10px_28px_rgba(15,35,65,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-extrabold text-[#0B1F3A]">{title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
            <MapPin size={13} className="text-[#0B63CE]" aria-hidden="true" />
            {neighborhood}, {city}
          </p>
        </div>
        <DemoBadge />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[12px] text-slate-600">
        <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{propertyType}</span>
        <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{transaction}</span>
        <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{price}</span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
          <Ruler size={13} className="text-[#0B63CE]" aria-hidden="true" />
          {surface}
        </span>
      </div>
      <p className="mt-3 text-[11.5px] text-slate-500">{locationLevel}</p>
      <p className="mt-1 text-[11.5px] text-slate-500">{contactMode}</p>
      <ul className="mt-3 space-y-1 text-[11.5px] text-slate-500">
        {pointsToVerify.slice(0, 3).map((point) => (
          <li key={point}>- {point}</li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DemoRequestButton label="Voir fiche demo" className="w-full" />
        <DemoRequestButton label="Demander info demo" className="w-full bg-[#0B1F3A] hover:bg-[#123458]" />
      </div>
    </article>
  );
}
