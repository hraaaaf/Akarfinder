// DEMAND-CAPTURE-MVP-1 — user-side "qualified demand" card.
// Pure presentation: nothing is sent anywhere. The demand stays a local,
// structured object the user can review before any confirmed sharing.
import type { SearchDemandProfile } from "@/lib/demand/search-demand-profile";

const FIELDS: { key: keyof Pick<SearchDemandProfile, "profileLabel" | "intentionLabel" | "propertyTypeLabel" | "zone" | "budget" | "surface" | "urgency">; label: string }[] = [
  { key: "profileLabel", label: "Profil" },
  { key: "intentionLabel", label: "Intention" },
  { key: "propertyTypeLabel", label: "Type de bien" },
  { key: "zone", label: "Zone" },
  { key: "budget", label: "Budget indicatif" },
  { key: "surface", label: "Surface" },
  { key: "urgency", label: "Délai" },
];

export function DemandSummaryCard({ demand }: { demand: SearchDemandProfile }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-bronze-700">
        Votre demande qualifiée
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="rounded-xl bg-surface-muted/40 p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-[13px] font-extrabold text-foreground">{demand[key]}</p>
          </div>
        ))}
      </div>

      {demand.priorities.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Priorités</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {demand.priorities.map((p) => (
              <li key={p} className="rounded-full bg-surface-muted px-2.5 py-1 text-[12px] font-semibold text-foreground/80">{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {demand.nonNegotiables.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Points non négociables</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {demand.nonNegotiables.map((p) => (
              <li key={p} className="rounded-full bg-bronze-500/10 px-2.5 py-1 text-[12px] font-bold text-bronze-700">{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-border/15 bg-surface-muted/30 p-3">
        <p className="text-[12px] leading-5 text-muted-foreground">
          À partager avec une agence partenaire, à utiliser pour créer une alerte,
          ou à garder pour vous. <span className="font-bold text-foreground/80">À confirmer avant envoi</span> —
          aucun envoi automatique.
        </p>
        {demand.contact ? (
          <p className="mt-2 text-[12px] font-semibold text-foreground/80">
            Contact joint (avec votre consentement) : {demand.contact.name} — {demand.contact.reachVia}
          </p>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Aucun contact joint — la demande reste anonyme tant que vous ne donnez pas votre consentement.
          </p>
        )}
      </div>
    </div>
  );
}
