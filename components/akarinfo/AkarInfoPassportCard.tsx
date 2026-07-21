"use client";

import type { AkarInfoPassport } from "@/lib/akarinfo/akarinfo-passport";

type AkarInfoPassportCardProps = {
  passport: AkarInfoPassport;
  variant?: "compact" | "full";
  className?: string;
};

const LEVEL_STYLES: Record<AkarInfoPassport["information_level_label"], string> = {
  "Aperçu limité":
    "border-slate-400/20 bg-slate-500/10 text-slate-200 dark:text-white/75",
  "Fiche structurée":
    "border-blue-400/25 bg-blue-500/10 text-blue-700 dark:text-blue-200",
  "Fiche enrichie":
    "border-emerald-400/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
};

export function AkarInfoPassportCard({
  passport,
  variant = "compact",
  className = "",
}: AkarInfoPassportCardProps) {
  const compact = variant === "compact";
  const points = compact
    ? passport.points_to_verify.slice(0, 2)
    : passport.points_to_verify;
  const lifestyleEntries = passport.lifestyle_summary
    ? Object.entries(passport.lifestyle_summary.lifestyle_indicators)
    : [];
  const intelligence = passport.intelligence;

  return (
    <div
      className={`rounded-2xl border border-border/15 bg-surface/70 p-3.5 dark:border-white/10 dark:bg-white/[0.035] ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">
          Passeport AkarInfo
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${LEVEL_STYLES[passport.information_level_label]}`}
        >
          {passport.information_level_label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground dark:text-white/55">
        <span>{passport.source_type_label}</span>
        <span>{passport.source_original_label}</span>
        {passport.source_name ? <span>Source : {passport.source_name}</span> : null}
      </div>

      <p className="mt-2.5 text-[12px] leading-5 text-foreground/80 dark:text-white/72">
        {passport.summary}
      </p>

      {intelligence ? (
        <div className="mt-3 rounded-xl border border-bronze-500/20 bg-bronze-500/[0.06] px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-bronze-700 dark:text-bronze-300">
                Lecture AkarFinder
              </p>
              <p className="mt-1 text-[12px] font-bold text-foreground/85 dark:text-white/80">
                {intelligence.score_label}
              </p>
            </div>
            <span className="rounded-full border border-bronze-500/25 bg-card/70 px-2.5 py-1 text-[11px] font-extrabold text-bronze-700 dark:bg-white/[0.04] dark:text-bronze-200">
              {intelligence.score != null ? `${intelligence.score}/100` : "Analyse partielle"}
            </span>
          </div>

          <p className="mt-1.5 text-[10.5px] font-semibold text-muted-foreground dark:text-white/50">
            {intelligence.coverage_label}
          </p>

          {intelligence.signals.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {intelligence.signals.map((signal) => (
                <span
                  key={`${signal.code}:${signal.label}`}
                  className="rounded-full border border-border/15 bg-card/65 px-2.5 py-1 text-[10.5px] font-bold text-foreground/70 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/65"
                >
                  {signal.label}
                </span>
              ))}
            </div>
          ) : null}

          {intelligence.attention_label ? (
            <p className="mt-2 text-[11px] font-semibold leading-5 text-amber-700 dark:text-amber-200">
              {intelligence.attention_label}
            </p>
          ) : null}

          {!compact ? (
            <p className="mt-2 text-[10.5px] leading-5 text-muted-foreground dark:text-white/45">
              {intelligence.disclaimer}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground dark:text-white/45">
          À vérifier
        </p>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-foreground/78 dark:text-white/68">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-bronze-500" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {lifestyleEntries.length > 0 ? (
        <div className="mt-3 rounded-xl border border-border/12 bg-card/70 px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground dark:text-white/45">
            Repères quartier
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lifestyleEntries.map(([key, label]) => (
              <span
                key={key}
                className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[10.5px] font-bold text-blue-700 dark:text-blue-200"
              >
                {label}
              </span>
            ))}
          </div>
          {!compact ? (
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground dark:text-white/55">
              {passport.lifestyle_summary?.disclaimer}
            </p>
          ) : null}
        </div>
      ) : null}

      {passport.observation && passport.observation.labels.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {passport.observation.labels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-border/15 bg-card/70 px-2.5 py-1 text-[10.5px] font-bold text-muted-foreground dark:border-white/8 dark:bg-white/[0.03] dark:text-white/60"
            >
              {label}
            </span>
          ))}
          {!compact && passport.observation.help_line ? (
            <p className="mt-1 basis-full text-[11px] leading-5 text-muted-foreground dark:text-white/50">
              {passport.observation.help_line}
            </p>
          ) : null}
        </div>
      ) : null}

      {passport.similar_results?.similar_possible ? (
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
            Comparer
          </p>
          <p className="mt-1 text-[12px] leading-5 text-foreground/78 dark:text-white/68">
            Comparer avec les résultats similaires possibles avant de contacter.
          </p>
          {passport.similar_results.similar_reasons_public.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {passport.similar_results.similar_reasons_public.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-amber-400/20 bg-white/40 px-2.5 py-1 text-[10.5px] font-bold text-amber-800 dark:bg-white/[0.04] dark:text-amber-100"
                >
                  {reason}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {passport.checklist && passport.checklist.items.length > 0 ? (
        <div className="mt-3 rounded-xl border border-border/12 bg-card/60 px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground dark:text-white/45">
              {passport.checklist.title}
            </p>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70 dark:text-white/35">
              {passport.checklist.help_label}
            </span>
          </div>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-foreground/78 dark:text-white/68">
            {(compact
              ? passport.checklist.items.slice(0, 3)
              : passport.checklist.items
            ).map((item) => (
              <li key={item.label} className="flex gap-2">
                <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-border dark:bg-white/25" />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact ? (
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground dark:text-white/50">
          Préparation future : {passport.future_signals.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
