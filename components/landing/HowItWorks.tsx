import { Container } from "@/components/ui/Container";

const steps = [
  {
    n: "1",
    title: "Cherchez par ville ou quartier",
    body: "Lancez une recherche map-first et filtrez par budget, surface, type, fiabilité et profil MRE."
  },
  {
    n: "2",
    title: "Comparez les biens et les repères",
    body: "Prix au m², repère marché indicatif du quartier et signaux de fiabilité côte à côte."
  },
  {
    n: "3",
    title: "Contactez via WhatsApp",
    body: "Un contact direct, adapté à un achat sur place comme à distance pour les MRE."
  }
];

export function HowItWorks() {
  return (
    <section className="bg-surface py-14 sm:py-18">
      <Container>
        <div className="max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#2563eb]">Comment ça marche</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.03em] text-foreground sm:text-[2.4rem]">
            Trois étapes, du repérage au contact.
          </h2>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="group relative rounded-2xl border border-border/15 bg-card p-6 shadow-[0_2px_14px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(15,40,80,0.12)]">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#2563eb] text-[1.1rem] font-extrabold text-white shadow-[0_8px_18px_rgba(37,99,235,0.3)] transition-transform duration-300 group-hover:scale-110">
                {s.n}
              </span>
              <h3 className="mt-4 text-[1.15rem] font-bold tracking-tight text-card-foreground">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-7 text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
