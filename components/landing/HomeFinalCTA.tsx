import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function HomeFinalCTA() {
  return (
    <section className="bg-[#0C0C0C] pb-28 pt-36 sm:pb-36 sm:pt-44">
      <Container>
        <div className="mx-auto max-w-[820px] text-center">
          {/* Eyebrow */}
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#C2A368]">
            Commencez dès maintenant
          </span>

          {/* Title */}
          <h2 className="mt-5 text-[2.2rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-white sm:text-[3rem]">
            Prêt à chercher avec plus de clarté&nbsp;?
          </h2>

          {/* Subtitle — better contrast */}
          <p className="mx-auto mt-5 max-w-[560px] text-[1.05rem] leading-relaxed text-white/75">
            Comparez les biens, créez votre dossier acheteur indicatif ou demandez une visite depuis une fiche annonce.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href="/search"
              className="w-full rounded-xl bg-[#9B7838] px-9 py-4 text-[15px] font-extrabold text-white shadow-[0_8px_32px_rgba(155,120,56,0.40)] transition hover:brightness-110 hover:shadow-[0_12px_40px_rgba(155,120,56,0.55)] active:scale-[0.98] sm:w-auto"
            >
              Voir les biens analysés
            </Link>
            <Link
              href="/onboarding"
              className="w-full rounded-xl border border-white/28 bg-white/8 px-9 py-4 text-[15px] font-extrabold text-white/95 backdrop-blur transition hover:border-white/45 hover:bg-white/14 sm:w-auto"
            >
              Créer mon dossier acheteur
            </Link>
            <Link
              href="/pro"
              className="w-full rounded-xl border border-[#C2A368]/40 bg-[#C2A368]/10 px-9 py-4 text-[15px] font-extrabold text-[#C2A368] backdrop-blur transition hover:border-[#C2A368]/65 hover:bg-[#C2A368]/18 sm:w-auto"
            >
              Espace Pro
            </Link>
          </div>

          {/* Legal note — better contrast */}
          <p className="mx-auto mt-10 max-w-[600px] text-[11.5px] leading-6 text-white/48">
            Les informations affichées servent d&apos;aperçu produit ; aucun partenariat, volume ou statut de vérification n&apos;est revendiqué sans validation.
          </p>
        </div>
      </Container>

      {/* Thin visual separator from footer */}
      <div className="mx-auto mt-28 max-w-[160px] h-px bg-gradient-to-r from-transparent via-white/12 to-transparent sm:mt-36" />
    </section>
  );
}
