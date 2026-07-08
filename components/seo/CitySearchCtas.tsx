import Link from "next/link";
import type { CityMetadata } from "@/lib/seo-city-pages/types";
import { buildSearchQueryForCity, buildSearchQueryForIntent } from "@/lib/seo-city-pages/city-seo-data";

type CitySearchCtasProps = {
  city: CityMetadata;
};

export function CitySearchCtas({ city }: CitySearchCtasProps) {
  const propertyTypes = ["appartement", "villa", "studio", "programme neuf"];
  const intents = [
    { label: "Acheter", query: buildSearchQueryForIntent(city.displayName, "acheter") },
    { label: "Louer", query: buildSearchQueryForIntent(city.displayName, "louer") },
  ];

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* Intent CTAs */}
        <div className="mb-12">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Par intention
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {intents.map((intent) => (
              <Link
                key={intent.label}
                href={`/search?q=${intent.query}`}
                className="rounded-lg border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100"
              >
                <p className="font-semibold text-blue-900">{intent.label}</p>
                <p className="mt-1 text-sm text-blue-700">
                  Rechercher des annonces
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Property Type CTAs */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Par type de bien
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {propertyTypes.map((type) => (
              <Link
                key={type}
                href={`/search?q=${encodeURIComponent(`${type} ${city.displayName}`)}`}
                className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
              >
                <p className="text-sm font-semibold capitalize text-slate-900">
                  {type}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
