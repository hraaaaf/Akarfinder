"use client";

// DEMAND-CAPTURE-MVP-1 — optional demand-capture block for the search
// profile summary step. Contact is optional; consent is mandatory before
// the contact enters the demand. There is no send: the demand stays local
// and must be confirmed before any future sharing.
import { useState } from "react";
import { buildSearchDemandProfile } from "@/lib/demand/search-demand-profile";
import type { SearchProfile } from "@/lib/search-profile/search-profile-types";
import { DemandSummaryCard } from "./DemandSummaryCard";

export function DemandCaptureSection({ profile }: { profile: SearchProfile }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [reachVia, setReachVia] = useState("");
  const [consent, setConsent] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-bronze-500/35 bg-bronze-500/8 px-6 py-3.5 text-center text-[14px] font-extrabold text-bronze-700 transition hover:border-bronze-500/60"
      >
        Préparer ma demande qualifiée
      </button>
    );
  }

  const demand = buildSearchDemandProfile(profile, { name, reachVia, consent });
  const hasContactDetails = name.trim().length > 0 || reachVia.trim().length > 0;

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-border/20 bg-card p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-bronze-700">
          Contact (optionnel)
        </p>
        <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
          Votre demande peut rester anonyme. Si vous renseignez un contact, il
          ne sera joint qu&apos;avec votre consentement — et rien n&apos;est envoyé
          automatiquement.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Nom ou prénom"
            placeholder="Nom ou prénom (optionnel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-border/20 bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none transition focus:border-bronze-400/70"
          />
          <input
            aria-label="Comment vous joindre"
            placeholder="Comment vous joindre (optionnel)"
            value={reachVia}
            onChange={(e) => setReachVia(e.target.value)}
            className="rounded-xl border border-border/20 bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none transition focus:border-bronze-400/70"
          />
        </div>
        <label className="mt-3 flex items-start gap-2.5 text-[12.5px] leading-5 text-muted-foreground">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-bronze-500"
          />
          <span>
            J&apos;accepte que ces coordonnées soient jointes à ma demande qualifiée.
            Sans cette case, la demande reste anonyme.
          </span>
        </label>
        {hasContactDetails && !consent ? (
          <p className="mt-2 text-[12px] font-semibold text-amber-600">
            Contact renseigné mais non joint : cochez le consentement pour l&apos;inclure.
          </p>
        ) : null}
      </div>

      <DemandSummaryCard demand={demand} />
    </div>
  );
}
