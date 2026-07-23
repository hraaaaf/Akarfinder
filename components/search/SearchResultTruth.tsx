import type { AkarInfoPassport } from "@/lib/akarinfo/akarinfo-passport";

export type SearchResultTruthLevel = "analyzed" | "partial" | "observed";

type TruthConfig = {
  label: string;
  description: string;
  className: string;
};

export const SEARCH_RESULT_TRUTH: Record<SearchResultTruthLevel, TruthConfig> = {
  analyzed: {
    label: "Analysé par AkarFinder",
    description:
      "Lecture algorithmique disponible sur une fiche structurée. Ce statut ne signifie ni vérification juridique ni certification.",
    className:
      "border-emerald-400/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
  },
  partial: {
    label: "Analyse partielle",
    description:
      "Fiche structurée, mais données insuffisantes pour une lecture AkarFinder complète.",
    className:
      "border-amber-400/30 bg-amber-500/12 text-amber-700 dark:text-amber-200",
  },
  observed: {
    label: "Résultat observé",
    description:
      "Aperçu issu d’une source externe. Prix, disponibilité et détails doivent être confirmés sur la source originale.",
    className:
      "border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-white/75",
  },
};

export function getSearchResultTruthLevel(
  passport: AkarInfoPassport,
): SearchResultTruthLevel {
  if (passport.kind === "gateway_external") return "observed";
  return passport.intelligence?.score != null ? "analyzed" : "partial";
}

export function SearchResultTruthBadge({
  level,
  className = "",
}: {
  level: SearchResultTruthLevel;
  className?: string;
}) {
  const config = SEARCH_RESULT_TRUTH[level];
  return (
    <span
      title={config.description}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export function SearchTruthLegend() {
  return (
    <div className="mt-3 rounded-2xl border border-border/15 bg-card/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.035]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground dark:text-white/45">
          Comment lire les résultats
        </p>
        {(Object.keys(SEARCH_RESULT_TRUTH) as SearchResultTruthLevel[]).map((level) => (
          <div key={level} className="flex items-center gap-2">
            <SearchResultTruthBadge level={level} />
            <span className="hidden text-[11px] text-muted-foreground xl:inline">
              {level === "analyzed"
                ? "lecture AkarFinder disponible"
                : level === "partial"
                  ? "données encore incomplètes"
                  : "source originale à confirmer"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] leading-5 text-muted-foreground dark:text-white/45">
        « Analysé » décrit une lecture algorithmique des données disponibles ; cela ne veut jamais dire « vérifié », « certifié » ou « garanti ».
      </p>
    </div>
  );
}
