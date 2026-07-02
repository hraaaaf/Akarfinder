import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Contact — AkarFinder",
  description: "Contacter l'équipe AkarFinder.",
};

const MAILTO = "mailto:contact@akarfinder.ma?subject=Contact%20AkarFinder";

export default function ContactPage() {
  return (
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1 py-14 sm:py-20">
        <Container className="max-w-2xl">
          <h1 className="text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.4rem]">
            Contact
          </h1>
          <p className="mt-4 text-[14.5px] leading-7 text-muted-foreground">
            Une question sur une annonce, un partenariat ou le fonctionnement du site ? Écrivez-nous.
          </p>

          <a
            href={MAILTO}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B63CE] dark:bg-deepblue px-5 py-3.5 text-[13.5px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
          >
            Envoyer un email
          </a>

          <p className="mt-4 text-[12px] text-muted-foreground">
            Pour une demande de retrait d&apos;annonce, utilisez plutôt la page{" "}
            <Link href="/demande-retrait" className="text-deepblue underline underline-offset-2">
              Demande de retrait
            </Link>
            .
          </p>

          <Link
            href="/"
            className="mt-8 flex items-center gap-2 text-[13.5px] font-extrabold text-deepblue transition hover:gap-2.5"
          >
            <span aria-hidden="true">←</span> Retour à l&apos;accueil
          </Link>
        </Container>
      </div>
      <SiteFooter />
    </main>
  );
}
