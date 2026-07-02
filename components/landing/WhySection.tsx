import { Container } from "@/components/ui/Container";

const pillars = [
  {
    num: "01",
    title: "Cherchez plus simplement",
    body: "Lancez une recherche immobilière depuis une seule interface et accédez aux sources originales.",
  },
  {
    num: "02",
    title: "Comparez le quartier",
    body: "Prix/m² indicatif, proximité, commodités et repères locaux vous aident à mieux situer le bien avant de contacter.",
  },
  {
    num: "03",
    title: "Contactez à la source",
    body: "AkarFinder ne s'interpose pas : vous continuez sur le site d'origine ou auprès du partenaire autorisé.",
  },
];

export function WhySection() {
  return (
    <section className="bg-background py-24 sm:py-32">
      <Container>
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-accent">
            Notre différence
          </span>
          <h2 className="mt-4 text-[2rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.6rem]">
            Comparez avant de contacter.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-7 text-muted-foreground">
            AkarFinder vous aide à chercher sur plusieurs sources, comparer les repères de quartier, puis contacter la source originale.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {pillars.map((p) => (
            <div
              key={p.num}
              className="group rounded-2xl border border-border/15 bg-card p-10 shadow-[0_2px_20px_rgba(7,27,51,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(7,27,51,0.12)]"
            >
              <span className="block text-5xl font-extrabold leading-none tracking-[-0.04em] text-accent">
                {p.num}
              </span>
              <h3 className="mt-6 text-[1.2rem] font-extrabold leading-snug tracking-tight text-card-foreground">
                {p.title}
              </h3>
              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
