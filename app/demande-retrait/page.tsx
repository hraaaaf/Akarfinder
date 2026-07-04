import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Demande de retrait — AkarFinder",
  description: "Demander le retrait d'un résultat affiché ou de vos données sur AkarFinder.",
};

const MAILTO =
  "mailto:retrait@akarfinder.ma?subject=Demande%20de%20retrait%20AkarFinder";

export default function DemandeRetraitPage() {
  return (
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1 py-14 sm:py-20">
        <Container className="max-w-2xl">
          <h1 className="text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.4rem]">
            Demande de retrait
          </h1>
          <p className="mt-4 text-[14.5px] leading-7 text-muted-foreground">
            AkarFinder affiche des résultats provenant de sources tierces (agences, plateformes partenaires
            ou publiques) sous forme d&apos;aperçu limité — jamais de galerie complète, jamais de
            coordonnées de contact extraites. Si vous êtes le propriétaire, l&apos;agence ou le vendeur d&apos;une
            annonce affichée et souhaitez son retrait, ou si vous souhaitez faire valoir vos droits sur vos
            données personnelles, contactez-nous directement.
          </p>

          <div className="mt-8 rounded-[1.4rem] border border-border/20 bg-card p-6 shadow-[0_8px_28px_rgba(7,27,51,0.06)]">
            <h2 className="text-[1.1rem] font-extrabold text-foreground">Informations à préciser</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-muted-foreground">
              <li>Lien(s) de l&apos;annonce concernée sur AkarFinder</li>
              <li>Lien de l&apos;annonce sur le site source (Mubawab ou autre)</li>
              <li>Motif de la demande (retrait, correction, droit d&apos;accès/suppression RGPD-like)</li>
              <li>Un moyen de vous recontacter (email)</li>
            </ul>

            <a
              href={MAILTO}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B63CE] dark:bg-deepblue px-5 py-3.5 text-[13.5px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
            >
              Envoyer une demande de retrait
            </a>
            <p className="mt-3 text-[12px] text-muted-foreground">
              Réponse et traitement sous quelques jours ouvrés.
            </p>
          </div>
        </Container>
      </div>
      <SiteFooter />
    </main>
  );
}
