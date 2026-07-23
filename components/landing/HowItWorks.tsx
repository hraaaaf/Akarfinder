import { Container } from "@/components/ui/Container";

const steps = [
  {
    n: "1",
    title: "Cherchez par ville ou quartier",
    body: "Lancez une recherche et filtrez par budget, surface, type et contexte.",
  },
  {
    n: "2",
    title: "Comparez les biens et les repères",
    body: "Niveau d'information, source, prix et repères disponibles restent lisibles côte à côte.",
  },
  {
    n: "3",
    title: "Poursuivez sur la bonne source",
    body: "AkarFinder garde l'origine visible et vous dirige vers le bon parcours selon le type de résultat.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface py-12 sm:py-16">
      <Container>
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563eb] sm:text-[12px]">Comment ça marche</p>
          <h2 className="mt-2.5 text-[1.8rem] font-bold leading-tight tracking-[-0.03em] text-foreground sm:mt-3 sm:text-[2.4rem]">
            Trois étapes, sans détour.
          </h2>
        </div>

        <div className="mt-7 grid gap-3 sm:mt-9 sm:gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="group grid grid-cols-[auto_1fr] gap-x-4 rounded-2xl border border-border/15 bg-card p-4 shadow-[0_2px_14px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,40,80,0.12)] sm:block sm:p-6">
              <span className="row-span-2 grid h-9 w-9 place-items-center rounded-xl bg-[#2563eb] text-[0.95rem] font-extrabold text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)] transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11 sm:text-[1.1rem]">
                {s.n}
              </span>
              <h3 className="text-[1rem] font-bold tracking-tight text-card-foreground sm:mt-4 sm:text-[1.15rem]">{s.title}</h3>
              <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground sm:mt-2 sm:text-[14px] sm:leading-7">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
