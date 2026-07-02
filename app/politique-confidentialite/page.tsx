import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Politique de confidentialité — AkarFinder",
  description: "Politique de confidentialité et de traitement des données du site AkarFinder.",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1 py-14 sm:py-20">
        <Container className="max-w-3xl">
          <h1 className="text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.4rem]">
            Politique de confidentialité
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Version bêta — dernière mise à jour : 2026.
          </p>

          <div className="mt-8 space-y-7 text-[14.5px] leading-7 text-muted-foreground">
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">1. Données que nous ne collectons pas depuis les annonces</h2>
              <p className="mt-2">
                AkarFinder n&apos;extrait jamais de numéro de téléphone, d&apos;adresse WhatsApp ou d&apos;email depuis
                les annonces indexées de sources tierces. Les images ne sont jamais téléchargées, mises en cache
                ou rehébergées : seule une référence d&apos;URL distante peut être affichée, quand la source
                l&apos;autorise publiquement.
              </p>
            </section>
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">2. Données que vous nous transmettez</h2>
              <p className="mt-2">
                Lorsque vous utilisez un formulaire (alerte, dossier acheteur, demande de visite), les
                informations saisies sont utilisées uniquement pour le service demandé et ne sont jamais
                revendues à des tiers.
              </p>
            </section>
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">3. Cookies et mesure d&apos;audience</h2>
              <p className="mt-2">
                Le site peut utiliser des cookies techniques et de mesure d&apos;audience anonymisée pour
                améliorer le service. Aucune donnée de navigation n&apos;est partagée à des fins publicitaires
                tierces.
              </p>
            </section>
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">4. Vos droits</h2>
              <p className="mt-2">
                Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données, ainsi que le
                retrait d&apos;une annonce indexée qui vous concerne, via la page{" "}
                <a href="/demande-retrait" className="text-deepblue underline underline-offset-2">
                  Demande de retrait
                </a>.
              </p>
            </section>
          </div>
        </Container>
      </div>
      <SiteFooter />
    </main>
  );
}
