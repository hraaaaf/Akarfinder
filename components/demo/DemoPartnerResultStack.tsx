import { ArrowRight, ExternalLink } from "lucide-react";
import { DemoBadge } from "./DemoBadge";

const RESULTS = [
  {
    rank: "1",
    label: "Page partenaire autorisee",
    title: "Appartement familial - partenaire demo",
    body: "Fiche enrichie avec localisation exploitable, photos autorisees et CTA partenaire.",
    tone: "blue",
  },
  {
    rank: "2",
    label: "Promoteur partenaire",
    title: "Programme neuf avec typologies et plans 2D",
    body: "Projet pertinent pour une recherche neuf, avec plan indicatif et brochure demo.",
    tone: "blue",
  },
  {
    rank: "3",
    label: "Agence premium",
    title: "Agence pertinente pour achat classique",
    body: "Contact autorise et bien structure selon le standard AkarFinder.",
    tone: "blue",
  },
  {
    rank: "4",
    label: "Agence partenaire",
    title: "Fiche structuree a completer",
    body: "Informations utiles mais moins enrichies qu'une page partenaire complete.",
    tone: "blue",
  },
  {
    rank: "5",
    label: "Resultat web externe",
    title: "Apercu limite depuis une source originale",
    body: "Sans image, sans contact direct, redirection vers la source originale.",
    tone: "neutral",
  },
];

export function DemoPartnerResultStack() {
  return (
    <section className="rounded-3xl border border-[#dbe7f6] bg-white p-5 shadow-[0_14px_40px_rgba(15,35,65,0.07)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <DemoBadge />
          <h2 className="mt-3 text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#0B1F3A]">
            Comment AkarFinder peut organiser les resultats
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500">
            Cette section illustre une logique future d&apos;affichage. Les resultats web externes restent consultables via leur source originale.
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {RESULTS.map((result) => (
          <article
            key={result.rank}
            className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
              result.tone === "neutral"
                ? "border-slate-200 bg-slate-50"
                : "border-[#0B63CE]/20 bg-[#f8fbff]"
            }`}
          >
            <span className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold ${
              result.tone === "neutral" ? "bg-slate-200 text-slate-600" : "bg-[#0B63CE] text-white"
            }`}>
              {result.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">{result.label}</p>
              <h3 className="mt-1 text-[14px] font-extrabold text-[#0B1F3A]">{result.title}</h3>
              <p className="mt-1 text-[12px] leading-5 text-slate-500">{result.body}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-extrabold text-[#0B63CE]">
              {result.tone === "neutral" ? "Voir la source originale" : "CTA enrichi"}
              {result.tone === "neutral" ? <ExternalLink size={13} aria-hidden="true" /> : <ArrowRight size={13} aria-hidden="true" />}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
