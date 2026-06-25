import { Check, Search, Copy, Clock } from "lucide-react";
import { Container } from "@/components/ui/Container";

const signals = [
  {
    Icon: Check,
    title: "Prix cohérent",
    desc: "Comparé aux annonces similaires du même secteur et de la même période.",
    color: "text-bronze-700",
    bg: "bg-[#f3ede0]",
  },
  {
    Icon: Search,
    title: "Source identifiée",
    desc: "L'origine de chaque annonce est visible avant tout contact ou déplacement.",
    color: "text-deepblue",
    bg: "bg-deepblue/8",
  },
  {
    Icon: Copy,
    title: "Doublons surveillés",
    desc: "Les annonces en double sont signalées automatiquement pour éviter les confusions.",
    color: "text-bronze-700",
    bg: "bg-[#f3ede0]",
  },
  {
    Icon: Clock,
    title: "Historique suivi",
    desc: "Variations de prix et fraîcheur de l'annonce visibles d'un coup d'œil.",
    color: "text-bronze-700",
    bg: "bg-[#f3ede0]",
  },
] as const;

export function TrustSignalBlock() {
  return (
    <section className="bg-white py-14 lg:py-20">
      <Container>
        <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-bronze-700">
          Moteur d&apos;analyse
        </p>
        <h2 className="mt-2 text-center text-[1.7rem] font-extrabold tracking-[-0.04em] text-deepblue sm:text-[2.3rem]">
          Pourquoi cette annonce est fiable ?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[15px] leading-7 text-gray-500">
          AkarFinder analyse la source, le prix/m², les doublons, la fraîcheur
          et la complétude avant de vous laisser contacter.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {signals.map(({ Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="flex flex-col rounded-[1.4rem] border border-[#eadfca] bg-[#fffdf8] p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]"
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${bg} ${color}`}>
                <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
                {title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-6 text-gray-500">
                {desc}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-[12.5px] font-medium text-gray-500">
          Score calculé automatiquement · Données mises à jour à chaque synchronisation ·
          Aucun partenariat commercial ne biaise l&apos;analyse.
        </p>
      </Container>
    </section>
  );
}
