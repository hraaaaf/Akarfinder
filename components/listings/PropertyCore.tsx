import { MapPin } from "lucide-react";
import { buildPropertyCoreModel } from "@/lib/listings/property-core";
import type { Listing } from "@/lib/listings/types";

export function PropertyCore({ listing }: { listing: Listing }) {
  const model = buildPropertyCoreModel(listing);

  return (
    <section
      data-announcement-property-core="ann-l3"
      data-price-state={model.priceAvailable ? "available" : "missing"}
      className="border-b border-slate-200 pb-6 pt-1 sm:pb-7"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#0B63CE] px-3 py-1 text-[11px] font-extrabold text-white">
          {model.transactionLabel}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
          {model.propertyType}
        </span>
      </div>

      <p
        data-property-core-price
        className="mt-4 text-[2rem] font-black leading-none tracking-[-0.055em] text-deepblue sm:text-[2.6rem]"
      >
        {model.priceLabel}
      </p>

      <h1
        data-property-core-title
        className="mt-3 max-w-[52rem] text-[1.55rem] font-extrabold leading-[1.12] tracking-[-0.04em] text-deepblue sm:text-[2rem]"
      >
        {model.title}
      </h1>

      <p className="mt-3 inline-flex max-w-full items-center gap-1.5 text-[13.5px] font-semibold text-slate-600 sm:text-[14.5px]">
        <MapPin size={16} aria-hidden="true" className="shrink-0 text-[#0B63CE]" />
        <span className="truncate sm:whitespace-normal">{model.location}</span>
      </p>

      {model.facts.length > 0 ? (
        <dl
          data-property-core-facts
          className="mt-5 grid grid-cols-2 border-y border-slate-200 sm:grid-cols-4"
        >
          {model.facts.map((fact) => (
            <div
              key={fact.key}
              data-property-core-fact={fact.key}
              className="min-w-0 border-b border-slate-200 py-3.5 pr-3 odd:border-r odd:pr-4 even:pl-4 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
            >
              <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">
                {fact.label}
              </dt>
              <dd className="mt-1 truncate text-[15px] font-extrabold text-deepblue sm:text-[16px]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
