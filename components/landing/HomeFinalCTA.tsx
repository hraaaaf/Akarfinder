import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function HomeFinalCTA() {
  return (
    <section className="bg-surface pb-28 pt-36 sm:pb-36 sm:pt-44">
      <Container>
        <div className="mx-auto max-w-[820px] text-center">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-accent">
            Commencez simplement
          </span>

          <h2 className="mt-5 text-[2.2rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[3rem]">
            Cherchez directement ou construisez Mon Projet.
          </h2>

          <p className="mx-auto mt-5 max-w-[590px] text-[1.05rem] leading-relaxed text-muted-foreground">
            Vous avez déjà vos critères ? Lancez le moteur. Vous hésitez encore sur vos priorités ? Le Compagnon structure votre projet avant la recherche.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href="/search"
              className="w-full rounded-xl bg-accent px-9 py-4 text-[15px] font-extrabold text-white shadow-[0_8px_32px_rgba(11,99,206,0.28)] transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
            >
              Lancer une recherche
            </Link>
            <Link
              href="/compagnon"
              className="w-full rounded-xl border border-border/30 bg-surface-muted px-9 py-4 text-[15px] font-extrabold text-foreground backdrop-blur transition hover:border-border/50 hover:bg-muted sm:w-auto"
            >
              Construire Mon Projet
            </Link>
          </div>

          <p className="mt-6 text-[12.5px] text-muted-foreground">
            Vous êtes une agence ou un promoteur ?{" "}
            <Link href="/pro" className="font-extrabold text-accent underline underline-offset-2">
              Découvrir AkarFinder Pro
            </Link>
          </p>

          <p className="mx-auto mt-10 max-w-[620px] text-[11.5px] leading-6 text-muted-foreground">
            AkarFinder distingue les fiches analysées, les analyses partielles et les offres simplement observées. Les sources et les limites d&apos;information restent visibles.
          </p>
        </div>
      </Container>

      <div className="mx-auto mt-28 h-px max-w-[160px] bg-gradient-to-r from-transparent via-border/30 to-transparent sm:mt-36" />
    </section>
  );
}
