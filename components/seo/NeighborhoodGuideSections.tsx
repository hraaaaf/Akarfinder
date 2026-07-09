import Link from "next/link";
import type { NeighborhoodMetadata } from "@/lib/seo-neighborhood-pages/types";
import { getNeighborhoodsByCity } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";

type Props = {
  neighborhood: NeighborhoodMetadata;
};

export function NeighborhoodGuideSections({ neighborhood: n }: Props) {
  const sameCity = getNeighborhoodsByCity(n.citySlug).filter(
    (other) => other.slug !== n.slug,
  );

  return (
    <section className="border-t border-slate-200 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-12">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Comment rechercher à {n.displayName}
          </h2>
          <div className="mt-6 space-y-6">
            <div>
              <p className="font-semibold text-slate-900">1. Rechercher</p>
              <p className="mt-1 text-slate-600">
                Explorez des résultats immobiliers publics liés à{" "}
                {n.displayName}, {n.cityDisplayName}, depuis plusieurs sources.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">2. Comparer</p>
              <p className="mt-1 text-slate-600">
                Consultez plusieurs sources et comparez les annonces disponibles
                dans ce quartier.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                3. Vérifier sur la source originale
              </p>
              <p className="mt-1 text-slate-600">
                Accédez à la source originale pour confirmer les détails
                directement auprès de l&apos;annonceur.
              </p>
            </div>
          </div>
        </div>

        {sameCity.length > 0 && (
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Autres quartiers à {n.cityDisplayName}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sameCity.map((other) => (
                <Link
                  key={other.slug}
                  href={`/immobilier/${other.citySlug}/${other.slug}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <p className="font-semibold text-slate-900">
                    {other.displayName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {other.propertyTypes.slice(0, 2).join(" • ")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <Link
            href={`/immobilier/${n.citySlug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Retour à {n.cityDisplayName}
          </Link>
        </div>
      </div>
    </section>
  );
}
