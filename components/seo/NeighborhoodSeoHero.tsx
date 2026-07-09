import Link from "next/link";
import { Search } from "lucide-react";
import type { NeighborhoodMetadata } from "@/lib/seo-neighborhood-pages/types";
import { buildNeighborhoodSearchQuery } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";

type Props = {
  neighborhood: NeighborhoodMetadata;
};

export function NeighborhoodSeoHero({ neighborhood: n }: Props) {
  const searchQuery = buildNeighborhoodSearchQuery(n.displayName, n.cityDisplayName);

  return (
    <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Immobilier à {n.displayName}, {n.cityDisplayName} : rechercher des
          annonces depuis plusieurs sources
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Moteur de recherche immobilier — explorez et comparez
        </p>

        <p className="mt-6 text-base leading-7 text-slate-700">
          {n.description}
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href={`/search?q=${searchQuery}`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <Search size={18} aria-hidden="true" />
            Rechercher à {n.displayName}
          </Link>
        </div>
      </div>
    </section>
  );
}
