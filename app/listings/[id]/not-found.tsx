import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";

export default function ListingDetailNotFound() {
  return (
    <div className={`min-h-screen ${ui.pageLight}`} data-announcement-state="not-found">
      <SiteHeader searchMode fluid />
      <main>
        <Container fluid className="max-w-[1500px] py-16 lg:px-8 lg:py-24">
          <section className="mx-auto max-w-2xl rounded-[1.5rem] border border-slate-200 bg-white p-7 text-center shadow-[0_10px_32px_rgba(24,56,96,0.06)] sm:p-10">
            <p className={ui.eyebrow}>Annonce indisponible</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-[#0B2545] sm:text-3xl">
              Cette fiche n’est pas accessible
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Le bien peut avoir été retiré, ne plus être publiable sur AkarFinder ou nécessiter une consultation sur sa source d’origine.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/search" className={ui.primaryActionPill}>
                Revenir aux résultats
              </Link>
              <Link href="/" className={ui.secondaryActionPill}>
                Accueil AkarFinder
              </Link>
            </div>
          </section>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
