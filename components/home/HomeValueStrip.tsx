import { Container } from "@/components/ui/Container";

const VALUES = [
  {
    title: "Marché observé",
    detail: "Prix, volumes et fraîcheur qualifiés pour lire le marché sans fausse certitude.",
  },
  {
    title: "Confiance lisible",
    detail: "Provenance, fraîcheur et précision restent visibles avant de prendre une décision.",
  },
  {
    title: "Territoire utile",
    detail: "Quartiers, vie locale et contexte immobilier avant de choisir un bien.",
  },
] as const;

export function HomeValueStrip() {
  return (
    <section data-home-value-strip="p1-a1" className="border-b border-[#DCE8F5] bg-[#F4F8FC] py-8 sm:py-9">
      <Container>
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUES.map((item) => (
            <article
              key={item.title}
              className="rounded-[28px] border border-[#DCE8F5] bg-white p-5 shadow-[0_14px_36px_rgba(11,31,58,0.07)] sm:p-6"
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">AkarFinder</p>
              <h2 className="mt-2 text-lg font-extrabold tracking-[-0.025em] text-[#0B1F3A]">{item.title}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
