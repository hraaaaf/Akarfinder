import { AlertCircle } from "lucide-react";

export function SeoSafetyNotice() {
  return (
    <section className="border-t border-slate-200 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex gap-3">
          <AlertCircle
            size={24}
            className="shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div>
            <h3 className="font-semibold text-amber-900">
              Vérifier toujours la source originale
            </h3>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              AkarFinder affiche des résultats immobiliers publics et vous renvoie vers la
              source originale. Avant de contacter, confirmez directement auprès de
              l&apos;annonceur :
            </p>
            <ul className="mt-3 space-y-1 text-sm text-amber-800">
              <li>• La disponibilité réelle du bien</li>
              <li>• Le prix et les conditions affichés</li>
              <li>• L&apos;authenticité de l&apos;annonce</li>
              <li>• Les détails et photos</li>
            </ul>
            <p className="mt-3 text-sm text-amber-700">
              AkarFinder ne remplace pas une visite ni une vérification directe avec
              l&apos;annonceur.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
