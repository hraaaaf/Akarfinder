import { Container } from "@/components/ui/Container";

const pillars = [
  {
    num: "01",
    title: "Une recherche, plusieurs origines",
    body: "AkarFinder rassemble des fiches structurées et des résultats publics dans une même recherche, tout en gardant la source et le niveau d'information visibles.",
  },
  {
    num: "02",
    title: "Le bruit est signalé, pas maquillé",
    body: "Lorsque plusieurs offres se ressemblent, AkarFinder affiche des signaux de rapprochement pour aider à comparer sans prétendre qu'il s'agit forcément du même bien.",
  },
  {
    num: "03",
    title: "Vous savez ce qu'AkarFinder sait",
    body: "Analysé, analyse partielle ou simple offre observée : le niveau de lecture est explicite et les informations manquantes ne sont jamais inventées.",
  },
];

export function WhySection() {
  return (
    <section className="bg-background py-24 sm:py-32">
      <Container>
        <div className="mb-16 text-center">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-accent">
            Ce que le moteur fait réellement
          </span>
          <h2 className="mt-4 text-[2rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.6rem]">
            Moins de bruit. Plus de contexte.
          </h2>
          <p className="mx-auto mt-4 max-w-[620px] text-[15px] leading-7 text-muted-foreground">
            La différence AkarFinder n&apos;est pas d&apos;inventer plus d&apos;informations : c&apos;est de mieux organiser ce qui est disponible et de montrer clairement les limites de chaque résultat.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.num}
              className="group rounded-2xl border border-border/15 bg-card p-10 shadow-[0_2px_20px_rgba(7,27,51,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(7,27,51,0.12)]"
            >
              <span className="block text-5xl font-extrabold leading-none tracking-[-0.04em] text-accent">
                {pillar.num}
              </span>
              <h3 className="mt-6 text-[1.2rem] font-extrabold leading-snug tracking-tight text-card-foreground">
                {pillar.title}
              </h3>
              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">{pillar.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
