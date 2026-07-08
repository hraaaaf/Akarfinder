import Link from "next/link";
import { getAllCities } from "@/lib/seo-city-pages/city-seo-data";

export const metadata = {
  title: "Immobilier au Maroc | AkarFinder",
  description:
    "Recherchez des annonces immobilières au Maroc, accédez à la source originale et comparez les résultats publics avec AkarFinder.",
  robots: { index: true, follow: true },
};

export default function ImmobilierPage() {
  const cities = getAllCities();

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Immobilier au Maroc
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Moteur de recherche immobilier — explorez et comparez
          </p>

          <p className="mt-6 text-base leading-7 text-slate-700">
            AkarFinder vous aide à explorer des résultats immobiliers publics au Maroc
            et à accéder à la source originale pour vérifier les détails complets avant
            de contacter.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Rechercher par ville
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/immobilier/${city.slug}`}
                className="group rounded-lg border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700">
                  {city.displayName}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {city.popularSearches.slice(0, 2).join(" • ")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Comment ça marche ?
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <p className="font-semibold text-slate-900">1. Rechercher</p>
              <p className="mt-1 text-slate-600">
                Explorez des résultats immobiliers publics pour la ville et le type de
                bien qui vous intéresse.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">2. Comparer</p>
              <p className="mt-1 text-slate-600">
                Consultez plusieurs sources et comparez les annonces avant de décider.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">3. Vérifier</p>
              <p className="mt-1 text-slate-600">
                Accédez à la source originale pour confirmer les détails directement
                auprès de l&apos;annonceur.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
