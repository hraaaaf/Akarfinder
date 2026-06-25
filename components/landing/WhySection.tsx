import { Container } from "@/components/ui/Container";

const pillars = [
  {
    num: "01",
    title: "Recherche centralisée",
    body: "AkarFinder rassemble les annonces disponibles pour limiter les recherches dispersées sur plusieurs portails.",
  },
  {
    num: "02",
    title: "Signaux de confiance",
    body: "Les doublons, prix atypiques et données incomplètes sont signalés de manière indicative, avant que vous ne contactiez.",
  },
  {
    num: "03",
    title: "Contact mieux qualifié",
    body: "Dossier acheteur, demande de visite et WhatsApp permettent de contacter avec plus de contexte et moins d'incertitude.",
  },
];

export function WhySection() {
  return (
    <section className="bg-[#FBFAF5] py-24 sm:py-32">
      <Container>
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#9B7838]">
            Notre différence
          </span>
          <h2 className="mt-4 text-[2rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-[#071B33] sm:text-[2.6rem]">
            Comparez avant de contacter.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-7 text-[#6B7280]">
            AkarFinder ajoute une couche de lecture utile au marché marocain : données analysées, signaux indicatifs, contact contextualisé.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {pillars.map((p) => (
            <div
              key={p.num}
              className="group rounded-2xl border border-[#E8E0D0] bg-white p-10 shadow-[0_2px_20px_rgba(7,27,51,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(7,27,51,0.12)]"
            >
              <span className="block text-5xl font-extrabold leading-none tracking-[-0.04em] text-[#C2A368]">
                {p.num}
              </span>
              <h3 className="mt-6 text-[1.2rem] font-extrabold leading-snug tracking-tight text-[#071B33]">
                {p.title}
              </h3>
              <p className="mt-3 text-[14px] leading-7 text-[#6B7280]">{p.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
