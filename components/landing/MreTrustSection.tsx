import Link from "next/link";
import { Container } from "@/components/ui/Container";

const points = [
  { title: "Quartier lisible", body: "Repères de proximité indicatifs pour situer le bien sans être sur place." },
  { title: "Source analysée", body: "L'origine de l'annonce et sa fraîcheur sont affichées clairement." },
  { title: "Repères indicatifs", body: "Repère marché du quartier, sans estimation officielle ni promesse trompeuse." },
  { title: "Contact WhatsApp", body: "Échange direct avec le vendeur, adapté à un achat à distance." },
  { title: "Fiche décision claire", body: "Prix, prix/m², fiabilité et historique réunis sur une seule page." }
];

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function MreTrustSection() {
  return (
    <section className="bg-background py-14 sm:py-18">
      <Container>
        <div className="overflow-hidden rounded-3xl border border-border/15 bg-card">
          <div className="grid gap-0 lg:grid-cols-[1fr_1.3fr]">
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#7c3aed]/15 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-[#7c3aed]">
                Pensé pour les MRE
              </span>
              <h2 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.03em] text-card-foreground sm:text-[2.3rem]">
                Décider à distance, en confiance.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                Les Marocains du monde achètent souvent sans visite. AkarFinder réunit les repères
                qui aident à juger un bien et à contacter rapidement le bon interlocuteur.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link href="/onboarding" className="w-fit rounded-xl bg-[#7c3aed] px-5 py-3 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(124,58,237,0.25)] transition hover:bg-[#6d28d9]">
                  Créer mon dossier acheteur →
                </Link>
                <Link href="/search?mre=true" className="w-fit rounded-xl border border-[#7c3aed]/30 px-5 py-3 text-[14px] font-bold text-[#7c3aed] transition hover:bg-[#7c3aed]/10">
                  Explorer les biens →
                </Link>
              </div>
            </div>

            <div className="grid content-center gap-3 p-8 sm:grid-cols-2 sm:p-10">
              {points.map((pt) => (
                <div key={pt.title} className="rounded-xl border border-border/15 bg-surface p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#7c3aed]/15"><Check /></span>
                    <p className="text-[14px] font-bold text-card-foreground">{pt.title}</p>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{pt.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
