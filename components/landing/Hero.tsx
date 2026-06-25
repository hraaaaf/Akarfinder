import { SearchPanel } from "@/components/landing/SearchPanel";
import { Container } from "@/components/ui/Container";
import { heroCities, siteCopy } from "@/lib/site";

const heroImage =
  "https://citytoursmorocco.com/images/hero-casablanca-skyline.webp";

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

export function Hero() {
  return (
    <section id="recherche" className="relative overflow-hidden bg-midnight text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,18,40,0.82)_0%,rgba(8,30,62,0.62)_44%,rgba(8,31,62,0.28)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,12,27,0.04)_0%,rgba(3,12,27,0.52)_100%)]" />

      <Container className="relative pb-8 pt-20 sm:pb-10 sm:pt-24 lg:pt-28">
        {/* Floating badge top right */}
        <div className="absolute right-4 top-6 hidden items-center gap-2.5 rounded-full border border-white/20 bg-white/95 px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur sm:flex sm:right-6 lg:right-8">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#2563eb] text-white">
            <HomeIcon />
          </span>
          <div>
            <p className="text-[13px] font-extrabold leading-none text-gray-900">+150 000</p>
            <p className="mt-0.5 text-[11px] font-semibold text-gray-500">annonces indexées</p>
          </div>
        </div>

        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/12 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#ff7a1a]" />
            {siteCopy.badge}
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.03] tracking-[-0.04em] text-white sm:text-5xl lg:text-[4.55rem]">
            Le moteur de recherche immobilier du{" "}
            <span className="text-[#ff7a1a]">Maroc</span>
          </h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-8 text-white/82">
            Recherchez parmi des milliers d'annonces provenant des principaux sites immobiliers marocains.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Sources analysées",
              "Doublons regroupés",
              "Prix comparés",
              "Alertes MRE"
            ].map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-white/18 bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white/84 backdrop-blur"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-7 max-w-6xl">
          <SearchPanel />
          {/* Micro preuve data — discrète, sous la search box */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-medium text-white/54">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#ff7a1a]/70" />
              Sources analysées
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#ff7a1a]/70" />
              Doublons détectés
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#ff7a1a]/70" />
              Prix comparés
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <p className="text-[13px] font-semibold text-white/74">Villes populaires :</p>
          <div className="flex flex-wrap gap-2">
            {heroCities.map((city) => (
              <button
                key={city}
                type="button"
                className="rounded-lg border border-white/16 bg-[#061b3a]/72 px-5 py-2 text-[13px] font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white hover:text-navy"
              >
                {city}
              </button>
            ))}
            <button
              type="button"
              className="rounded-lg border border-white/16 bg-white/10 px-5 py-2 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white hover:text-navy"
            >
              Toutes les villes
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
