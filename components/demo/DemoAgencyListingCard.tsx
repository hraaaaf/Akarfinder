import Link from "next/link";
import { BedDouble, MapPin, Ruler } from "lucide-react";
import { DemoBadge } from "./DemoBadge";
import { DemoRequestButton } from "./DemoRequestButton";
import { PropertyVisual, type PropertyVisualType } from "./PropertyVisual";

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
  visual?: PropertyVisualType;
  pointsToVerify: string[];
  // DEMO-PROMOTER-AGENCY-REALISTIC-MOCKUP-1 — optional richer mockup fields
  bedrooms?: string;
  features?: string[];
  infoLevel?: string;
  detailHref?: string;
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
  visual,
  pointsToVerify,
  bedrooms,
  features,
  infoLevel,
  detailHref,
}: DemoAgencyListingCardProps) {
  return (
    <article className="rounded-2xl border border-[#dbe7f6] bg-white p-5 shadow-[0_10px_28px_rgba(15,35,65,0.06)]">
      {visual ? <PropertyVisual type={visual} ratio="16:10" className="mb-4 rounded-xl" /> : null}
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
      <p className="mt-3 text-[17px] font-extrabold tracking-[-0.02em] text-[#0B1F3A]">{price}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-600">
        <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{propertyType}</span>
        <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{transaction}</span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
          <Ruler size={13} className="text-[#0B63CE]" aria-hidden="true" />
          {surface}
        </span>
        {bedrooms ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
            <BedDouble size={13} className="text-[#0B63CE]" aria-hidden="true" />
            {bedrooms}
          </span>
        ) : null}
      </div>
      {features && features.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {features.map((feature) => (
            <li key={feature} className="rounded-full bg-[#0B63CE]/8 px-2.5 py-1 text-[11.5px] font-bold text-[#0B63CE]">
              {feature}
            </li>
          ))}
        </ul>
      ) : null}
      {infoLevel ? (
        <p className="mt-3 text-[11.5px] font-bold text-[#0B63CE]">{infoLevel}</p>
      ) : null}
      <p className="mt-2 text-[11.5px] text-slate-500">{locationLevel}</p>
      <p className="mt-1 text-[11.5px] text-slate-500">{contactMode}</p>
      <ul className="mt-3 space-y-1 text-[11.5px] text-slate-500">
        {pointsToVerify.slice(0, 3).map((point) => (
          <li key={point}>- {point}</li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {detailHref ? (
          <Link
            href={detailHref}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#0B63CE] px-4 py-2.5 text-[13px] font-extrabold text-white transition hover:bg-[#084BA8]"
          >
            Voir la fiche type
          </Link>
        ) : (
          <DemoRequestButton label="Voir fiche demo" className="w-full" />
        )}
        <DemoRequestButton label="Demander une visite" className="w-full bg-[#0B1F3A] hover:bg-[#123458]" />
      </div>
    </article>
  );
}
