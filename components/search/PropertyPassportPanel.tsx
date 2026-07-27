"use client";

import { BarChart3, CheckCircle2, Database, MapPin, ShieldCheck, X } from "lucide-react";
import type { Listing } from "@/lib/listings/types";
import { buildExplainRankingModel } from "@/lib/ux/explain-ranking";
import { buildPropertyPassportModel } from "@/lib/ux/property-passport";

export function PropertyPassportPanel({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const passport = buildPropertyPassportModel(listing);
  const ranking = buildExplainRankingModel(listing);

  return (
    <section
      aria-label="Passeport de la propriété"
      className="mt-4 rounded-2xl border border-border/15 bg-surface/70 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">
            Property Passport
          </p>
          <h3 className="mt-1 text-[1rem] font-extrabold text-foreground">Dossier factuel du bien</h3>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-5 text-muted-foreground">{passport.summary}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le passeport de la propriété"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/20 text-muted-foreground transition hover:text-foreground dark:border-white/12"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/12 bg-card/70 p-3 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            <Database size={12} aria-hidden="true" /> Identité et provenance
          </p>
          <dl className="mt-3 space-y-2 text-[11.5px]">
            <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Identité</dt><dd className="text-right font-bold text-foreground">{passport.identityLabel}</dd></div>
            <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Niveau</dt><dd className="text-right font-bold text-foreground">{passport.informationLevel}</dd></div>
            <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Type de source</dt><dd className="text-right font-bold text-foreground">{passport.sourceType}</dd></div>
            {passport.sourceName ? <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Source</dt><dd className="text-right font-bold text-foreground">{passport.sourceName}</dd></div> : null}
            <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">Action source</dt><dd className="text-right font-bold text-foreground">{passport.sourceActionLabel}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-border/12 bg-card/70 p-3 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            <MapPin size={12} aria-hidden="true" /> Localisation
          </p>
          <p className="mt-3 text-[12px] font-extrabold text-foreground">{passport.locationLabel}</p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{passport.geoLabel}</p>
        </div>

        <div className="rounded-xl border border-border/12 bg-card/70 p-3 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            <ShieldCheck size={12} aria-hidden="true" /> Qualité disponible
          </p>
          {passport.qualityItems.length > 0 ? (
            <dl className="mt-3 space-y-2 text-[11.5px]">
              {passport.qualityItems.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="text-right font-bold text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">Aucun indicateur chiffré publiable n’est disponible.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/12 bg-card/70 p-3 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            <CheckCircle2 size={12} aria-hidden="true" /> À vérifier
          </p>
          <ul className="mt-3 space-y-2 text-[11.5px] leading-5 text-foreground/80">
            {passport.pointsToVerify.map((point) => (
              <li key={point} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-bronze-500" /><span>{point}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-blue-400/20 bg-blue-500/[0.06] p-3 dark:border-blue-300/15">
        <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">
          <BarChart3 size={12} aria-hidden="true" /> {ranking.title}
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-foreground/80">{ranking.summary}</p>
        {ranking.signals.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {ranking.signals.map((signal) => (
              <li key={signal.code} className="rounded-lg border border-border/12 bg-card/60 px-3 py-2 dark:border-white/8 dark:bg-white/[0.025]">
                <p className="text-[11px] font-extrabold text-foreground">{signal.label}</p>
                <p className="mt-0.5 text-[10.5px] leading-4 text-muted-foreground">{signal.evidence}</p>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-[10.5px] leading-4 text-muted-foreground">{ranking.limitation}</p>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border/20 px-3 py-3 dark:border-white/12">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Preuves non disponibles</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          {passport.unavailableEvidence.join(" · ")}. Ces éléments ne seront affichés qu’après exposition de contrats DATA certifiés.
        </p>
      </div>
    </section>
  );
}
