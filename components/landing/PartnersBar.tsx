import { Container } from "@/components/ui/Container";
import { sources } from "@/lib/site";

export function PartnersBar() {
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-8">
      <Container>
        <p className="mb-6 text-center text-[11.5px] font-bold uppercase tracking-[0.2em] text-gray-400">
          Sources immobilières que nous analysons
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {sources.map((source) => (
            <span
              key={source}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-bold text-gray-400 transition-all duration-200 hover:border-[#2563eb]/30 hover:text-gray-700"
            >
              {source}
            </span>
          ))}
          <span className="text-[13px] font-semibold text-gray-400">
            et plusieurs autres...
          </span>
        </div>
      </Container>
    </section>
  );
}
