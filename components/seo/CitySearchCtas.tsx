import Link from "next/link";
import type { CityMetadata } from "@/lib/seo-city-pages/types";

type CitySearchCtasProps = { city: CityMetadata };

export function CitySearchCtas({ city }: CitySearchCtasProps) {
  const cityParam = encodeURIComponent(city.displayName);
  const propertyTypes = ["Appartement", "Villa", "Studio"];
  const intents = [
    { label: "Acheter", href: `/search?city=${cityParam}&transaction_type=buy` },
    { label: "Louer", href: `/search?city=${cityParam}&transaction_type=rent` },
    { label: "Neuf", href: `/search?city=${cityParam}&transaction_type=new` },
  ];

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-extrabold text-slate-900">Rechercher à {city.displayName}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {intents.map((intent) => <Link key={intent.label} href={intent.href} className="rounded-lg border border-slate-200 bg-white p-4 font-semibold text-slate-900 transition hover:border-blue-300 hover:bg-blue-50">{intent.label}</Link>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {propertyTypes.map((type) => <Link key={type} href={`/search?city=${cityParam}&property_type=${encodeURIComponent(type)}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{type}</Link>)}
        </div>
      </div>
    </section>
  );
}
