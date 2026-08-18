import { Bath, BedDouble, CarFront, MapPin, Maximize2 } from "lucide-react";
import { buildPropertyCoreModel, type PropertyCoreFactKey } from "@/lib/listings/property-core";
import type { Listing } from "@/lib/listings/types";

const factIcons = {
  surface: Maximize2,
  bedrooms: BedDouble,
  bathrooms: Bath,
  garage: CarFront,
} satisfies Record<PropertyCoreFactKey, typeof Maximize2>;

export function PropertyCore({ listing }: { listing: Listing }) {
  const model = buildPropertyCoreModel(listing);

  return (
    <section
      data-announcement-property-core="ann-l3"
      data-price-state={model.priceAvailable ? "available" : "missing"}
      className="relative"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#0B63CE] px-3 py-1.5 text-[10.5px] font-extrabold text-white shadow-[0_8px_24px_rgba(11,99,206,0.18)] sm:px-3.5 sm:text-[11px]">
          {model.transactionLabel}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-700 shadow-sm sm:px-3.5 sm:text-[11px]">
          {model.propertyType}
        </span>
      </div>

      <div className="mt-4 sm:mt-5">
        <p
          data-property-core-price
          className="text-[2rem] font-black leading-none tracking-[-0.04em] text-deepblue sm:text-[2.75rem] sm:tracking-[-0.055em] lg:text-[3rem]"
        >
          {model.priceLabel}
        </p>

        <h1
          data-property-core-title
          className="mt-2.5 max-w-[54rem] break-words text-[1.5rem] font-black leading-[1.14] tracking-[-0.035em] text-deepblue sm:mt-3 sm:text-[2rem] sm:leading-[1.08] sm:tracking-[-0.045em] lg:text-[2.15rem]"
        >
          {model.title}
        </h1>

        <p className="mt-2.5 inline-flex max-w-full items-start gap-2 text-[13px] font-semibold leading-5 text-slate-500 sm:mt-3 sm:text-[14.5px]">
          <MapPin size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-[#0B63CE]" />
          <span className="min-w-0 break-words">{model.location}</span>
        </p>
      </div>

      {model.facts.length > 0 ? (
        <dl
          data-property-core-facts
          className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,38,68,0.07)] sm:mt-6 sm:grid-cols-4"
        >
          {model.facts.map((fact) => {
            const Icon = factIcons[fact.key];
            return (
              <div
                key={fact.key}
                data-property-core-fact={fact.key}
                className="group min-w-0 border-b border-r border-slate-100 p-3 last:border-r-0 even:border-r-0 sm:border-b-0 sm:p-4 sm:even:border-r sm:last:border-r-0"
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0B63CE] transition group-hover:bg-blue-100 sm:h-9 sm:w-9">
                    <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400 sm:text-[9.5px] sm:tracking-[0.11em]">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 break-words text-[14px] font-black text-deepblue sm:text-[16px]">
                      {fact.value}
                    </dd>
                  </div>
                </div>
              </div>
            );
          })}
        </dl>
      ) : null}
    </section>
  );
}
