import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { getNeighborhoods } from "@/lib/map/canonical-neighborhood-data";

const FEATURED_IDS = new Set([
  "casablanca-maarif",
  "rabat-agdal",
  "marrakech-gueliz",
]);

function confidenceLabel(value: string) {
  if (value === "high") return "Confiance élevée";
  if (value === "medium") return "Confiance moyenne";
  return "Confiance limitée";
}

export function SignatureMapSection() {
  const featured = getNeighborhoods()
    .filter((point) => FEATURED_IDS.has(point.id))
    .slice(0, 3);

  return (
    <section className="bg-[#071B33] py-24 text-white sm:py-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.4fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#60A5FA]">
              Intelligence quartier
            </span>
            <h2 className="mt-4 text-[2rem] font-extrabold leading-[1.12] tracking-[-0.035em] sm:text-[2.7rem]">
              Montrer le quartier quand nous avons de vrais repères.
            </h2>
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-white/65">
              AkarFinder n&apos;affiche pas une carte « intelligente » pour décorer. Les repères quartier sont reliés à des entités géographiques canoniques, avec période et niveau de confiance visibles.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-[#084BA8]"
              >
                <MapPinned size={16} aria-hidden="true" /> Explorer la carte
              </Link>
              <Link
                href="/quartiers"
                className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/6 px-5 py-3 text-[13px] font-extrabold text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                Voir les quartiers<ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-6 text-[11px] leading-5 text-white/42">
              Les repères sont indicatifs. Une absence de donnée reste une absence de donnée : elle n&apos;est jamais remplacée par une estimation décorative.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {featured.map((point) => (
              <article
                key={point.id}
                className="flex min-h-[300px] flex-col rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.16)]"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#60A5FA]">{point.city}</p>
                <h3 className="mt-2 text-[1.35rem] font-extrabold tracking-[-0.03em]">{point.neighborhood}</h3>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Repère prix</p>
                    <p className="mt-1 text-[14px] font-extrabold text-white/90">{point.priceSignal.label}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                    <div className="rounded-xl border border-white/8 bg-black/10 p-3">
                      <p className="text-white/40">Période</p>
                      <p className="mt-1 font-bold text-white/75">{point.benchmark.period}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/10 p-3">
                      <p className="text-white/40">Données</p>
                      <p className="mt-1 font-bold text-white/75">{confidenceLabel(point.confidence)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {point.lifestyleTags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10.5px] font-semibold text-white/65">
                      {tag}
                    </span>
                  ))}
                </div>

                <Link href={point.searchHref} className="mt-auto pt-7 text-[12.5px] font-extrabold text-[#93C5FD] transition hover:text-white">
                  Rechercher dans ce quartier →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
