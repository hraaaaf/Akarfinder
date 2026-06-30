import { Container } from "@/components/ui/Container";

const footerLinks = {
  AkarFinder: ["À propos", "Comment ça marche", "Nos partenaires", "Presse"],
  Explorer: ["Acheter", "Louer", "Neuf", "Carte des biens"],
  Outils: ["Repère marché", "Alertes", "Comparateur", "Conseils immo"],
  Aide: ["FAQ", "Contact", "Conditions d'utilisation", "Politique de confidentialité"]
};

// Social brand icons kept as SVG (not in Lucide)
function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
    </svg>
  );
}
function YoutubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
    </svg>
  );
}

const socials = [
  { label: "Instagram", Icon: InstagramIcon },
  { label: "Facebook",  Icon: FacebookIcon  },
  { label: "LinkedIn",  Icon: LinkedInIcon  },
  { label: "YouTube",   Icon: YoutubeIcon   },
];

export function SiteFooter() {
  return (
    <footer id="footer" className="bg-surface-muted py-10 text-foreground lg:py-12">
      <Container>
        {/* Mobile : compact single column */}
        <div className="lg:hidden">
          <img
            src="/brand/logo-v2/logo-header-light.png"
            alt="AkarFinder"
            width={184}
            height={46}
            className="h-[42px] w-auto dark:hidden"
          />
          <img
            src="/brand/logo-v2/logo-header-dark.png"
            alt="AkarFinder"
            width={184}
            height={46}
            className="hidden h-[42px] w-auto dark:block"
          />
          <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground">
            AkarFinder — moteur de recherche immobilier du Maroc.
            Comparez avant de contacter.
          </p>
          <div className="mt-4 flex gap-2">
            {socials.map(({ label, Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-full bg-foreground/10 text-muted-foreground transition hover:bg-bronze-700 hover:text-white"
              >
                <Icon />
              </a>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            <a href="#" className="hover:text-foreground">Acheter</a>
            <a href="#" className="hover:text-foreground">Louer</a>
            <a href="#" className="hover:text-foreground">Comment ça marche</a>
            <a href="#" className="hover:text-foreground">FAQ</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
          <div className="mt-6 border-t border-border/15 pt-5 text-[11.5px] text-muted-foreground">
            © 2026 AkarFinder.ma — Version bêta
          </div>
        </div>

        {/* Desktop : full footer */}
        <div className="hidden gap-10 lg:grid lg:grid-cols-[1.15fr_2fr_1fr]">
          <div>
            <img
            src="/brand/logo-v2/logo-header-light.png"
            alt="AkarFinder"
            width={184}
            height={46}
            className="h-[42px] w-auto dark:hidden"
          />
            <img
            src="/brand/logo-v2/logo-header-dark.png"
            alt="AkarFinder"
            width={184}
            height={46}
            className="hidden h-[42px] w-auto dark:block"
          />
            <p className="mt-4 max-w-sm text-[14.5px] leading-7 text-muted-foreground">
              AkarFinder centralise la recherche immobilière au Maroc, aide à repérer les doublons et prépare une meilleure qualification de la demande acheteur.
            </p>
            <div className="mt-5 flex gap-2.5">
              {socials.map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full bg-foreground/10 text-muted-foreground transition hover:bg-bronze-700 hover:text-white"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-4">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
                <div className="mt-4 grid gap-2.5 text-[13.5px] text-muted-foreground">
                  {links.map((link) => (
                    <a key={link} href="#" className="transition hover:text-foreground">
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-[14px] font-bold text-foreground">Restez informé</h3>
            <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground">
              Recevez les prochaines nouveautés lorsque les alertes seront activées.
            </p>
            <div className="mt-5 flex overflow-hidden rounded-xl bg-card ring-1 ring-border/15 transition focus-within:ring-bronze-500">
              <input
                aria-label="Email pour les alertes"
                placeholder="Votre email"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button className="bg-bronze-700 px-5 text-[13px] font-bold text-white transition hover:bg-bronze-800">
                OK
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 hidden flex-col gap-2 border-t border-border/15 pt-6 text-[12px] leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:flex">
          <span>© 2026 AkarFinder.ma — Version bêta</span>
          <span>Les informations affichées servent d&apos;aperçu produit ; aucun partenariat, volume ou statut de vérification n&apos;est revendiqué sans validation.</span>
        </div>
      </Container>
    </footer>
  );
}
