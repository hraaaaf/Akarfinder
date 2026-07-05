// DEMAND-CAPTURE-MVP-1 — partner-side preview of a qualified demand.
// Shows an agency/promoter what they would receive: budget, zone, intention,
// urgency, criteria and non-negotiables. Contact appears only if consented.
import type { SearchDemandProfile } from "@/lib/demand/search-demand-profile";

export function QualifiedDemandPreview({ demand }: { demand: SearchDemandProfile }) {
  return (
    <div className="rounded-2xl border border-[#0B63CE]/20 bg-[#f8fbff] p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">
        Aperçu reçu par le partenaire
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <PreviewCell label="Budget" value={demand.budget} />
        <PreviewCell label="Zone" value={demand.zone} />
        <PreviewCell label="Intention" value={demand.intentionLabel} />
        <PreviewCell label="Urgence" value={demand.urgency} />
        <PreviewCell label="Type de bien" value={demand.propertyTypeLabel} />
        <PreviewCell label="Surface" value={demand.surface} />
      </div>

      {demand.neighborhoodConstraints.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Critères quartier</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {demand.neighborhoodConstraints.map((c) => (
              <li key={c} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200">{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {demand.nonNegotiables.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Non négociables</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {demand.nonNegotiables.map((c) => (
              <li key={c} className="rounded-full bg-[#0B63CE]/10 px-2.5 py-1 text-[12px] font-bold text-[#0B63CE]">{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-[12px] leading-5 text-slate-500">
        {demand.contact
          ? `Contact transmis avec consentement : ${demand.contact.name} — ${demand.contact.reachVia}.`
          : "Demande anonyme : le contact n'est transmis qu'avec le consentement explicite de l'utilisateur."}
      </p>
    </div>
  );
}

function PreviewCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-[13px] font-extrabold text-[#0B1F3A]">{value}</p>
    </div>
  );
}
