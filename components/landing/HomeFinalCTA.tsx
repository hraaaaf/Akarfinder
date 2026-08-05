import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function HomeFinalCTA() {
  return (
    <section className="bg-[#071B33] py-20 text-white sm:py-24 lg:py-28">
      <Container>
        <div className="mx-auto max-w-[860px] text-center">
          <h2 className="text-[2.15rem] font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-[3rem] lg:text-[3.35rem]">
            <span className="block">Vous savez déjà ce que vous cherchez&nbsp;?</span>
            <span className="mt-2 block text-white/78">Recherchez directement ou laissez-vous guider.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-7 text-white/68 sm:text-[16px]">
            Recherchez directement ou précisez votre projet étape par étape.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href="/search"
              className="w-full rounded-xl bg-[#0B63CE] px-9 py-4 text-[15px] font-extrabold text-white shadow-[0_12px_34px_rgba(11,99,206,0.34)] transition hover:bg-[#0D70E8] active:scale-[0.98] sm:w-auto"
            >
              Rechercher un bien
            </Link>
            <Link
              href="/compagnon"
              className="w-full rounded-xl border border-white/24 bg-white/[0.07] px-9 py-4 text-[15px] font-extrabold text-white backdrop-blur transition hover:border-white/38 hover:bg-white/[0.12] sm:w-auto"
            >
              Me laisser guider
            </Link>
          </div>

          <p className="mt-6 text-[12.5px] text-white/62">
            Vous êtes une agence ou un promoteur ?{" "}
            <Link href="/pro" className="font-extrabold text-[#93C5FD] underline decoration-white/25 underline-offset-4 transition hover:text-white">
              Découvrir AkarFinder Pro
            </Link>
          </p>
        </div>
      </Container>
    </section>
  );
}
