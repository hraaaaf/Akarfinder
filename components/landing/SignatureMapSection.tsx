import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

const signals = [
  {
    title: "Quartiers lisibles",
    body: "Comparez les quartiers avec des repères simples, sans transformer la carte en promesse officielle.",
    className: "lg:left-8 lg:top-28"
  },
  {
    title: "Fiabilité visible",
    body: "Identifiez les annonces plus complètes, les doublons possibles et les signaux à vérifier.",
    className: "lg:right-10 lg:top-24"
  },
  {
    title: "Prix observés",
    body: "Repérez les biens avec prix/m² observé lorsque les données disponibles le permettent.",
    className: "lg:left-14 lg:bottom-20"
  },
  {
    title: "Proximité utile",
    body: "Visualisez les repères autour du quartier : transport, marché, pharmacie, écoles, services.",
    className: "lg:right-8 lg:bottom-24"
  }
];

const cityPins = [
  { city: "Tanger", x: 61, y: 16 },
  { city: "Rabat", x: 53, y: 28 },
  { city: "Casablanca", x: 50, y: 36 },
  { city: "Fès", x: 63, y: 29 },
  { city: "Marrakech", x: 46, y: 50 },
  { city: "Agadir", x: 39, y: 65 }
];

function MapPin({ city, x, y }: { city: string; x: number; y: number }) {
  return (
    <span
      className="signature-pin absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`Repère indicatif ${city}`}
    >
      <span className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#60a5fa]/25 blur-sm" />
      <span className="relative block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#ffb547] shadow-[0_0_24px_rgba(255,181,71,0.75)]" />
      <span className="absolute left-3 top-[-18px] hidden whitespace-nowrap rounded-full border border-white/15 bg-[#071a34]/80 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-md sm:block">
        {city}
      </span>
    </span>
  );
}

export function SignatureMapSection() {
  return (
    <section id="signature-map" className="relative overflow-hidden bg-[#06172f] py-16 text-white sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_28%,rgba(37,99,235,0.34),transparent_62%),radial-gradient(38%_38%_at_78%_16%,rgba(255,181,71,0.16),transparent_62%),linear-gradient(180deg,#071c39_0%,#051226_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.62)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.62)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(70%_64%_at_50%_35%,black,transparent)]" />
      <div className="signature-orb pointer-events-none absolute left-1/2 top-20 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-[#2563eb]/25 blur-3xl" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#bfdbfe] backdrop-blur">
            Version bêta · utile pour les MRE
          </p>
          <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.045em] text-white sm:text-5xl lg:text-[3.4rem]">
            La carte intelligente de l&apos;immobilier marocain
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[15.5px] leading-8 text-white/72 sm:text-[17px]">
            Explorez les villes marocaines avec des repères indicatifs : biens disponibles, prix
            observés, fiabilité, proximité et signaux de confiance. À confirmer avant décision.
          </p>
        </div>

        <div className="relative mx-auto mt-12 max-w-6xl">
          <div className="relative mx-auto flex min-h-[470px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] px-4 py-10 shadow-[0_36px_100px_rgba(0,0,0,0.42)] backdrop-blur-sm sm:min-h-[580px] lg:min-h-[650px] lg:px-12">
            <div className="pointer-events-none absolute inset-4 rounded-[1.65rem] border border-white/8" />
            <div className="pointer-events-none absolute bottom-6 left-1/2 h-20 w-[72%] -translate-x-1/2 rounded-full bg-[#38bdf8]/14 blur-3xl" />

            <div className="relative h-[390px] w-full max-w-[760px] sm:h-[510px] lg:h-[575px]">
              <Image
                src="/images/morocco-map-complete-premium.png"
                alt="Carte complète du Maroc, recolorisée dans l'identité AkarFinder"
                fill
                sizes="(min-width: 1024px) 760px, 92vw"
                priority={false}
                className="object-contain drop-shadow-[0_28px_42px_rgba(0,0,0,0.45)]"
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_35%_at_58%_20%,rgba(255,255,255,0.18),transparent_66%)] mix-blend-screen" />
              {cityPins.map((pin) => (
                <MapPin key={pin.city} {...pin} />
              ))}
            </div>

            <div className="pointer-events-none absolute left-6 top-6 hidden rounded-2xl border border-white/12 bg-[#071a34]/70 px-4 py-3 shadow-2xl backdrop-blur-md sm:block">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#93c5fd]">Aperçu carte</p>
              <p className="mt-1 text-[13px] font-semibold text-white/80">Villes prioritaires · repères indicatifs</p>
            </div>

            {signals.map((signal) => (
              <article
                key={signal.title}
                className={`signature-card hidden w-[235px] rounded-2xl border border-white/12 bg-white/[0.09] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-md lg:absolute lg:block ${signal.className}`}
              >
                <h3 className="text-[14px] font-extrabold tracking-[-0.01em] text-white">{signal.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-5 text-white/64">{signal.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:hidden">
            {signals.map((signal) => (
              <article key={signal.title} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <h3 className="text-[14px] font-extrabold text-white">{signal.title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-white/64">{signal.body}</p>
              </article>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/map"
            className="rounded-xl bg-white px-5 py-3 text-[14px] font-extrabold text-[#0b2345] shadow-[0_14px_30px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#f8fbff]"
          >
            Voir la carte interactive →
          </Link>
          <Link
            href="/#villes"
            className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[14px] font-bold text-white backdrop-blur transition hover:bg-white/18"
          >
            Explorer par ville
          </Link>
          <Link
            href="/onboarding"
            className="rounded-xl border border-[#C2A368]/50 bg-[#C2A368]/15 px-5 py-3 text-[14px] font-bold text-[#f5d98a] backdrop-blur transition hover:bg-[#C2A368]/25"
          >
            Créer mon dossier acheteur
          </Link>
        </div>

        {/* Visit block */}
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 text-center backdrop-blur">
          <p className="text-[13.5px] leading-6 text-white/65">
            Quand un bien vous intéresse, vous pouvez proposer un créneau de visite depuis sa fiche.
          </p>
          <Link
            href="/search"
            className="mt-2 inline-block text-[13px] font-bold text-[#bfdbfe] underline underline-offset-2 hover:text-white"
          >
            Voir les biens disponibles →
          </Link>
        </div>
      </Container>
    </section>
  );
}
