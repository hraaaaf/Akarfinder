import { Container } from "@/components/ui/Container";
import { valueCards } from "@/lib/site";

export function ValueCards() {
  return (
    <section className="border-b border-navy/8 bg-white">
      <Container>
        <div className="grid divide-y divide-navy/10 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {valueCards.map((card) => (
            <article key={card.title} className="flex gap-4 px-2 py-8 sm:px-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eef6ff] text-lg font-bold text-[#145ee8]">
                {card.accent}
              </span>
              <div>
                <h2 className="text-[1.02rem] font-bold text-navy">{card.title}</h2>
                <p className="mt-1.5 text-[15px] leading-7 text-stone">
                  {card.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
