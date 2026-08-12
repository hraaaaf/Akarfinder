import Link from "next/link";
import { Container } from "@/components/ui/Container";

type FooterLink = { label: string; href: string };

type FooterGroup = {
  title: string;
  links: FooterLink[];
};

type SiteFooterProps = {
  variant?: "default" | "search";
};

const footerGroups: FooterGroup[] = [
  {
    title: "Explorer",
    links: [
      { label: "Acheter", href: "/acheter" },
      { label: "Louer", href: "/louer" },
      { label: "Neuf", href: "/neuf" },
      { label: "Carte", href: "/map" },
      { label: "Comparateur", href: "/compare" },
    ],
  },
  {
    title: "AkarFinder",
    links: [
      { label: "À propos", href: "/a-propos" },
      { label: "Comment ça marche", href: "/comment-ca-marche" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Professionnels & aide",
    links: [
      { label: "AkarFinder Pro", href: "/pro" },
      { label: "Agences", href: "/pro/agences" },
      { label: "Promoteurs", href: "/promoteurs" },
      { label: "Demande de retrait", href: "/demande-retrait" },
      { label: "Conditions d'utilisation", href: "/conditions-utilisation" },
      { label: "Politique de confidentialité", href: "/politique-confidentialite" },
    ],
  },
];

const focusClasses =
  "rounded-sm transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B9BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#041426]";

export function SiteFooter({ variant = "default" }: SiteFooterProps) {
  const showBeta = process.env.NEXT_PUBLIC_APP_STAGE === "beta";
  const isSearch = variant === "search";

  return (
    <footer
      id="footer"
      data-search-footer={isSearch ? "compact" : undefined}
      className={
        isSearch
          ? "bg-[#041426] py-7 text-white sm:py-8 lg:py-8"
          : "bg-[#041426] py-12 text-white sm:py-14 lg:py-16"
      }
    >
      <Container>
        <div
          className={
            isSearch
              ? "grid gap-6 lg:grid-cols-[0.9fr_2.1fr] lg:gap-12"
              : "grid gap-10 lg:grid-cols-[1.2fr_2fr] lg:gap-16"
          }
        >
          <div>
            <img
              src="/brand/logo-v2/logo-header-dark.png"
              alt="AkarFinder"
              width={184}
              height={46}
              className={isSearch ? "h-8 w-auto sm:h-9" : "h-[44px] w-auto"}
            />
            <p
              className={
                isSearch
                  ? "mt-3 hidden max-w-sm text-[13px] leading-5 text-white/66 sm:block"
                  : "mt-5 max-w-md text-[14px] leading-7 text-white/66 sm:text-[14.5px]"
              }
            >
              Le moteur de recherche immobilier qui vous aide à chercher, comparer et comprendre avant de décider.
            </p>
          </div>

          <div className={isSearch ? "hidden gap-7 sm:grid sm:grid-cols-3" : "hidden gap-10 sm:grid sm:grid-cols-3"}>
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className={isSearch ? "text-[12.5px] font-extrabold text-white" : "text-[13px] font-extrabold text-white"}>
                  {group.title}
                </h3>
                <div
                  className={
                    isSearch
                      ? "mt-3 grid gap-1.5 text-[12.5px] leading-[18px] text-white/62"
                      : "mt-4 grid gap-2.5 text-[13px] text-white/62"
                  }
                >
                  {group.links.map((link) => (
                    <Link key={link.label} href={link.href} data-footer-link className={focusClasses}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={isSearch ? "divide-y divide-white/10 border-y border-white/10 sm:hidden" : "space-y-2 sm:hidden"}>
            {footerGroups.map((group) => (
              <details
                key={group.title}
                data-footer-mobile-group
                className={
                  isSearch
                    ? "group"
                    : "group rounded-xl border border-white/10 bg-white/[0.035] px-4 py-1"
                }
              >
                <summary
                  className={
                    isSearch
                      ? "flex min-h-11 cursor-pointer list-none items-center justify-between text-[13px] font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4B9BFF]"
                      : "flex cursor-pointer list-none items-center justify-between py-3 text-[13px] font-extrabold text-white"
                  }
                >
                  {group.title}
                  <span aria-hidden="true" className="text-lg font-light text-white/55 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div
                  className={
                    isSearch
                      ? "grid border-t border-white/8 py-1 text-[13px] text-white/62"
                      : "grid gap-3 border-t border-white/8 pb-4 pt-3 text-[13px] text-white/62"
                  }
                >
                  {group.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      data-footer-link
                      className={isSearch ? `flex min-h-11 items-center ${focusClasses}` : focusClasses}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>

        <div
          data-footer-trust-line
          className={
            isSearch
              ? "mt-6 flex flex-col gap-2 border-t border-white/10 pt-4 text-[11.5px] leading-5 text-white/48 sm:flex-row sm:items-center sm:justify-between"
              : "mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11.5px] leading-5 text-white/48 sm:flex-row sm:items-center sm:justify-between"
          }
        >
          <span>© 2026 AkarFinder.ma{showBeta ? " — Version bêta" : ""}</span>
          <span>Les sources et le niveau d&apos;information restent visibles pour chaque résultat.</span>
        </div>
      </Container>
    </footer>
  );
}
