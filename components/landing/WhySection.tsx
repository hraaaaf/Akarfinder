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
    <section className="bg-background py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="mb-9 text-center sm:mb-14">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-accent">
            Ce que le moteur fait réellement
          </span>
          <h2 className="mt-3 text-[1.85rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-foreground sm:mt-4 sm:text-[2.6rem]">
            Moins de bruit. Plus de contexte.
          </h2>
          <p className="mx-auto mt-3 max-w-[620px] text-[14px] leading-6 text-muted-foreground sm:mt-4 sm:text-[15px] sm:leading-7">
            La différence AkarFinder n&apos;est pas d&apos;inventer plus d&apos;informations : c&apos;est de mieux organiser ce qui est disponible et de montrer clairement les limites de chaque résultat.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-3 lg:gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.num}
              className="group grid grid-cols-[auto_1fr] gap-x-4 rounded-2xl border border-border/15 bg-card p-5 shadow-[0_2px_20px_rgba(7,27,51,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(7,27,51,0.12)] sm:block sm:p-8 lg:p-10"
            >
              <span className="row-span-2 block text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-accent sm:text-5xl">
                {pillar.num}
              </span>
              <h3 className="text-[1rem] font-extrabold leading-snug tracking-tight text-card-foreground sm:mt-5 sm:text-[1.15rem] lg:mt-6 lg:text-[1.2rem]">
                {pillar.title}
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground sm:mt-3 sm:text-[13.5px] sm:leading-6 lg:text-[14px] lg:leading-7">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
