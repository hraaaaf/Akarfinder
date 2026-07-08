import Link from "next/link";
import { Search } from "lucide-react";
import type { CityMetadata } from "@/lib/seo-city-pages/types";
import { buildSearchQueryForCity } from "@/lib/seo-city-pages/city-seo-data";

type CitySeoHeroProps = {
  city: CityMetadata;
};

export function CitySeoHero({ city }: CitySeoHeroProps) {
  const searchQuery = buildSearchQueryForCity(city.displayName);

  return (
    <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Immobilier à {city.displayName}
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Rechercher des annonces immobilières depuis plusieurs sources
        </p>

        <p className="mt-6 text-base leading-7 text-slate-700">
          AkarFinder aide à explorer des résultats immobiliers publics à{" "}
          {city.displayName} et vous renvoie vers la source originale pour vérifier les
          détails complets de chaque annonce.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href={`/search?q=${searchQuery}`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <Search size={18} aria-hidden="true" />
            Rechercher à {city.displayName}
          </Link>
          <p className="text-sm text-slate-500">
            Exemples : {city.popularSearches.slice(0, 2).join(", ")}
          </p>
        </div>
      </div>
    </section>
  );
}
