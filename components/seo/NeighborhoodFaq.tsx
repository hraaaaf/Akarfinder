import type { NeighborhoodMetadata } from "@/lib/seo-neighborhood-pages/types";

type Props = {
  neighborhood: NeighborhoodMetadata;
};

export function NeighborhoodFaq({ neighborhood: n }: Props) {
  return (
    <section className="border-t border-slate-200 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-extrabold text-slate-900">
          Questions fréquentes
        </h2>

        <div className="mt-6 space-y-6">
          <div>
            <p className="font-semibold text-slate-900">
              Quelle est la couverture d&apos;AkarFinder à {n.displayName} ?
            </p>
            <p className="mt-2 text-slate-600">
              AkarFinder explore les résultats immobiliers publics disponibles en
              ligne pour {n.displayName}, {n.cityDisplayName}. Pour une
              couverture complète, consultez directement les sources immobilières
              principales.
            </p>
          </div>

          <div>
            <p className="font-semibold text-slate-900">
              Comment vérifier une annonce trouvée via AkarFinder ?
            </p>
            <p className="mt-2 text-slate-600">
              AkarFinder vous renvoie vers la source originale de chaque
              résultat. Confirmez toujours les détails directement auprès de
              l&apos;annonceur avant de prendre une décision.
            </p>
          </div>

          <div>
            <p className="font-semibold text-slate-900">
              Puis-je réserver ou acheter directement sur AkarFinder ?
            </p>
            <p className="mt-2 text-slate-600">
              Non. AkarFinder est un moteur de recherche — vous devez consulter
              la source originale et traiter directement avec l&apos;annonceur.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
