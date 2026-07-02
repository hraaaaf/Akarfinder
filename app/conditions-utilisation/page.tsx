import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Conditions d'utilisation — AkarFinder",
  description: "Conditions d'utilisation du site AkarFinder.",
};

export default function ConditionsUtilisationPage() {
  return (
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1 py-14 sm:py-20">
        <Container className="max-w-3xl">
          <h1 className="text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.4rem]">
            Conditions d&apos;utilisation
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Version bêta — dernière mise à jour : 2026.
          </p>

          <div className="mt-8 space-y-7 text-[14.5px] leading-7 text-muted-foreground">
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">1. Nature du service</h2>
              <p className="mt-2">
                AkarFinder est un moteur de recherche immobilier. Il affiche des résultats provenant de
                sources publiques et des annonces de partenaires autorisés, avec des repères indicatifs
                (prix du marché, quartier, complétude des données). AkarFinder n&apos;est ni agence immobilière,
                ni intermédiaire de transaction.
              </p>
            </section>
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">2. Origine des annonces</h2>
              <p className="mt-2">
                Trois catégories de contenu coexistent sur le site : les annonces de partenaires autorisés
                (fiche complète), les annonces indexées depuis des sources tierces publiques (aperçu limité,
                redirection obligatoire vers la source d&apos;origine pour tout contact), et les résultats externes
                du moteur de recherche (extraits indexés, toujours attribués à leur source). La source de chaque
                annonce est systématiquement affichée.
              </p>
            </section>
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">3. Absence de garantie</h2>
              <p className="mt-2">
                Les indices, scores et repères de prix affichés sont indicatifs et calculés automatiquement.
                Ils ne constituent ni une expertise, ni un conseil financier, ni une garantie sur l&apos;exactitude,
                la disponibilité ou le prix réel d&apos;un bien. Vérifiez toujours les informations directement
                auprès de la source avant toute décision.
              </p>
            </section>
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">4. Utilisation autorisée</h2>
              <p className="mt-2">
                L&apos;utilisation du site à des fins de recherche personnelle est autorisée. Toute extraction
                automatisée, revente ou republication du contenu du site sans autorisation écrite est interdite.
              </p>
            </section>
            <section>
              <h2 className="text-[1.1rem] font-extrabold text-foreground">5. Contact</h2>
              <p className="mt-2">
                Pour toute question relative à ces conditions, voir la page{" "}
                <a href="/demande-retrait" className="text-deepblue underline underline-offset-2">
                  Demande de retrait
                </a>{" "}
                ou nous contacter via les canaux indiqués sur le site.
              </p>
            </section>
          </div>
        </Container>
      </div>
      <SiteFooter />
    </main>
  );
}
