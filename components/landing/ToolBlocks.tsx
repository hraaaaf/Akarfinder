import { Container } from "@/components/ui/Container";

const whyPoints = [
  "Agrégation de +20 sites immobiliers marocains",
  "Suppression automatique des doublons",
  "Alertes personnalisées sur les nouveaux biens",
  "Estimation IA de juste prix de votre bien",
  "Filtres spécifiques MRE (visite à distance, WhatsApp)",
  "Gratuit, rapide et sans inscription",
];

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export function ToolBlocks() {
  return (
    <section id="outils" className="bg-white py-16 sm:py-20">
      <Container>

        {/* Row 1 — Estimation IA (dominant) + Alertes */}
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">

          {/* Estimation IA — hero tool */}
          <div className="overflow-hidden rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#eff6ff] via-white to-white shadow-[0_2px_16px_rgba(37,99,235,0.08)]">
            <div className="p-7 sm:p-8">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#2563eb]">
                  Estimation IA
                </p>
                <span className="rounded-full bg-[#2563eb] px-2.5 py-0.5 text-[10px] font-bold text-white">
                  BÊTA
                </span>
              </div>
              <h3 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-gray-900 sm:text-3xl">
                Estimez le prix juste <br className="hidden sm:block" />de votre bien
              </h3>
              <p className="mt-3 max-w-sm text-[14.5px] leading-7 text-gray-500">
                Situez un bien face à des annonces comparables sur le marché marocain. Aucune estimation automatique n'est encore revendiquée.
              </p>
            </div>

            {/* Big price display */}
            <div className="mx-7 mb-2 rounded-2xl border border-[#dbeafe] bg-white p-6 text-center shadow-sm">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Valeur estimée
              </p>
              <p className="mt-2 text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-[#2563eb] sm:text-[3rem]">
                1 450 000 DH
              </p>
              <div className="mt-2 flex items-center justify-center gap-2 text-[13px] font-semibold text-gray-400">
                <span>Min : 1 390 000 DH</span>
                <span className="text-gray-200">·</span>
                <span>Max : 1 520 000 DH</span>
              </div>
              <p className="mt-2 text-[11.5px] text-gray-400">
                Basé sur +50 000 transactions et les données du marché
              </p>
            </div>

            <div className="grid gap-3 p-7 pt-4 sm:grid-cols-2 sm:p-8 sm:pt-4">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-400">
                Adresse ou quartier
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-400">
                Surface (m²)
              </div>
              <button className="col-span-full rounded-xl bg-[#2563eb] py-4 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.28)] transition hover:bg-[#1d4ed8] active:scale-[0.98]">
                Estimer le prix
              </button>
            </div>
          </div>

          {/* Alertes — conversion action */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#fed7aa] bg-gradient-to-br from-[#fff7ed] via-white to-white shadow-[0_2px_16px_rgba(255,122,26,0.08)]">
            <div className="p-7 sm:p-8">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#ff7a1a]">
                Alertes immobilières
              </p>
              <h3 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-gray-900">
                Recevez les bons signaux
              </h3>
              <ul className="mt-5 space-y-3">
                {[
                  "Comparez plus vite les biens similaires avant de contacter.",
                  "Repérez les annonces récentes ou à vérifier.",
                  "Alertes par ville, budget et type de bien.",
                  "Lecture claire pour acheteurs au Maroc et MRE.",
                ].map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-[14px] font-medium leading-6 text-gray-700">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff7a1a]" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>

            {/* Alert form */}
            <div className="mt-auto border-t border-orange-100 bg-white p-7 sm:p-8">
              <div className="space-y-2.5">
                {["Appartement", "Casablanca Maârif", "Budget max : 1 000 000 DH"].map((item) => (
                  <div key={item} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-[14px] font-semibold text-gray-600">
                    {item}
                  </div>
                ))}
                <button className="mt-1 w-full rounded-xl bg-[#ff7a1a] py-4 text-[15px] font-extrabold text-white shadow-[0_6px_20px_rgba(255,122,26,0.32)] transition hover:bg-[#ea6c0a] active:scale-[0.98]">
                  Créer mon alerte gratuite →
                </button>
                <p className="text-center text-[11.5px] font-semibold text-gray-400">
                  Gratuit · Sans inscription · Désactivable en 1 clic
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — Why section (horizontal, full-width) */}
        <div className="mt-5 rounded-2xl border border-gray-100 bg-[#f9fafb] p-7 shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:max-w-xs">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#2563eb]">
                Pourquoi nous choisir ?
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-[-0.02em] text-gray-900">
                Tout pour bien choisir avant d'acheter
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-2.5">
              {whyPoints.map((pt) => (
                <div key={pt} className="flex items-center gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#eff6ff] text-[#2563eb]">
                    <CheckIcon />
                  </span>
                  <span className="text-[13.5px] font-medium text-gray-700">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </Container>
    </section>
  );
}
