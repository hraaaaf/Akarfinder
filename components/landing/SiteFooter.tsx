import Link from "next/link";
import { Container } from "@/components/ui/Container";

type FooterLink = { label: string; href: string };

const footerLinks: Record<string, FooterLink[]> = {
  AkarFinder: [
    { label: "À propos", href: "/a-propos" },
    { label: "Comment ça marche", href: "/comment-ca-marche" },
  ],
  Explorer: [
    { label: "Acheter", href: "/acheter" },
    { label: "Louer", href: "/louer" },
    { label: "Neuf", href: "/neuf" },
    { label: "Carte des biens", href: "/map" },
  ],
  Outils: [
    { label: "Repère marché", href: "/acheter" },
    { label: "Comparateur", href: "/compare" },
  ],
  Aide: [
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
    { label: "Demande de retrait", href: "/demande-retrait" },
    { label: "Conditions d'utilisation", href: "/conditions-utilisation" },
    { label: "Politique de confidentialité", href: "/politique-confidentialite" },
  ],
};

export function SiteFooter() {
  return (
    <footer id="footer" className="bg-surface-muted py-10 text-foreground lg:py-12">
      <Container>
        <div className="lg:hidden">
          <img
            src="/brand/logo-v2/logo-horizontal-bilingual.png"
            alt="AkarFinder"
            width={260}
            height={74}
            className="h-[56px] w-auto dark:hidden"
          />
          <img
            src="/brand/logo-v2/logo-header-dark.png"
            alt="AkarFinder"
            width={184}
            height={46}
            className="hidden h-[42px] w-auto dark:block"
          />
          <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground">
            AkarFinder — moteur de recherche immobilier du Maroc. Comparez avant de contacter.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            <Link href="/acheter" className="hover:text-foreground">Acheter</Link>
            <Link href="/louer" className="hover:text-foreground">Louer</Link>
            <Link href="/comment-ca-marche" className="hover:text-foreground">Comment ça marche</Link>
            <Link href="/faq" className="hover:text-foreground">FAQ</Link>
            <Link href="/demande-retrait" className="hover:text-foreground">Demande de retrait</Link>
          </div>
          <div className="mt-6 border-t border-border/15 pt-5 text-[11.5px] text-muted-foreground">
            © 2026 AkarFinder.ma — Version bêta
          </div>
        </div>

        <div className="hidden gap-10 lg:grid lg:grid-cols-[1.15fr_2fr_1fr]">
          <div>
            <img
              src="/brand/logo-v2/logo-horizontal-bilingual.png"
              alt="AkarFinder"
              width={260}
              height={74}
              className="h-[56px] w-auto dark:hidden"
            />
            <img
              src="/brand/logo-v2/logo-header-dark.png"
              alt="AkarFinder"
              width={184}
              height={46}
              className="hidden h-[42px] w-auto dark:block"
            />
            <p className="mt-4 max-w-sm text-[14.5px] leading-7 text-muted-foreground">
              AkarFinder vous aide à chercher dans l'immobilier marocain, à comprendre le niveau d'information disponible et à retrouver la source originale.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-4">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
                <div className="mt-4 grid gap-2.5 text-[13.5px] text-muted-foreground">
                  {links.map((link) => (
                    <Link key={link.label} href={link.href} className="transition hover:text-foreground">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-[14px] font-bold text-foreground">Votre recherche</h3>
            <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground">
              Les alertes évolueront avec Mon Projet. En attendant, structurez vos critères dans un seul espace plutôt que de laisser un email dans un formulaire sans suite.
            </p>
            <Link
              href="/mon-projet"
              className="mt-5 inline-flex rounded-xl border border-border/20 bg-card px-4 py-3 text-[13px] font-extrabold text-foreground transition hover:border-accent/40 hover:text-accent"
            >
              Ouvrir Mon Projet
            </Link>
          </div>
        </div>

        <div className="mt-8 hidden flex-col gap-2 border-t border-border/15 pt-6 text-[12px] leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:flex">
          <span>© 2026 AkarFinder.ma — Version bêta</span>
          <span>Chaque résultat indique son niveau d'information et, lorsque nécessaire, renvoie vers la source originale.</span>
        </div>
      </Container>
    </footer>
  );
}
