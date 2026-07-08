import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CitySeoHero } from "@/components/seo/CitySeoHero";
import { CitySearchCtas } from "@/components/seo/CitySearchCtas";
import { SeoSafetyNotice } from "@/components/seo/SeoSafetyNotice";
import { getCityBySlug, getAllCities } from "@/lib/seo-city-pages/city-seo-data";
import { generateCitySeoMetadata } from "@/lib/seo-city-pages/seo-metadata";

type CityPageProps = {
  params: Promise<{ city: string }>;
};

export async function generateStaticParams() {
  const cities = getAllCities();
  return cities.map((city) => ({
    city: city.slug,
  }));
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const cityData = getCityBySlug(city);

  if (!cityData) {
    return {
      title: "Not Found",
      robots: { index: false, follow: false },
    };
  }

  const seo = generateCitySeoMetadata(cityData);

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonical,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      type: "website",
      url: seo.canonical,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const cityData = getCityBySlug(city);

  if (!cityData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <CitySeoHero city={cityData} />
      <CitySearchCtas city={cityData} />
      <SeoSafetyNotice />

      {/* FAQ */}
      <section className="border-t border-slate-200 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Questions fréquentes
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <p className="font-semibold text-slate-900">
                AkarFinder a-t-il toutes les annonces à {cityData.displayName} ?
              </p>
              <p className="mt-2 text-slate-600">
                Non. AkarFinder explore les résultats immobiliers publics disponibles
                en ligne. Toutes les annonces ne sont pas accessibles — consultez
                directement les sources immobilières principales pour une couverture
                complète.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">
                Les annonces sur AkarFinder sont-elles vérifiées ?
              </p>
              <p className="mt-2 text-slate-600">
                AkarFinder affiche des résultats publics sans effectuer de vérification
                indépendante. Confirmez toujours directement auprès de l&apos;annonceur
                avant de prendre une décision.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">
                Comment contacter l&apos;annonceur ?
              </p>
              <p className="mt-2 text-slate-600">
                AkarFinder vous renvoie vers la source originale de l&apos;annonce.
                Consultez-la pour obtenir les coordonnées de l&apos;annonceur ou du
                promoteur.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">
                Puis-je réserver ou acheter directement sur AkarFinder ?
              </p>
              <p className="mt-2 text-slate-600">
                Non. AkarFinder est un moteur de recherche — vous devez consulter la
                source originale et traiter directement avec l&apos;annonceur.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
