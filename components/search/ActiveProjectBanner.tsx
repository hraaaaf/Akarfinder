"use client";

import Link from "next/link";
import { GitCompare, Heart, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ContinuityItem = {
  project_id?: string | null;
};

type SearchProject = {
  id: string;
  name: string;
  status: string;
  profile?: unknown;
  updated_at: string;
};

type ContinuityState = {
  projects: SearchProject[];
  favorites: ContinuityItem[];
  comparisons: ContinuityItem[];
};

type ActiveProjectBannerProps = {
  requestedProjectId?: string;
};

function isStructuredProject(project: SearchProject) {
  if (!project.profile || typeof project.profile !== "object") return false;
  const profile = project.profile as Record<string, unknown>;
  return profile.version === "2.0";
}

export function ActiveProjectBanner({ requestedProjectId }: ActiveProjectBannerProps) {
  const [state, setState] = useState<ContinuityState | null>(null);
  const [loading, setLoading] = useState(Boolean(requestedProjectId));

  useEffect(() => {
    if (!requestedProjectId) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/me/continuity", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const payload = await response.json() as ContinuityState;
        if (!cancelled) setState(payload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedProjectId]);

  const project = useMemo(() => {
    if (!state || !requestedProjectId) return null;
    const requested = state.projects.find((item) => item.id === requestedProjectId);
    if (requested && requested.status === "active" && isStructuredProject(requested)) return requested;
    return null;
  }, [requestedProjectId, state]);

  if (!requestedProjectId) return null;

  if (loading) {
    return (
      <div className="border-b border-blue-100 bg-blue-50/80 px-4 py-3 text-[#084FA8]">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 text-sm font-bold">
          <Loader2 size={15} className="animate-spin" />
          Chargement du projet actif…
        </div>
      </div>
    );
  }

  if (!project || !state) return null;

  const favoriteCount = state.favorites.filter((item) => item.project_id === project.id).length;
  const comparisonCount = state.comparisons.filter((item) => item.project_id === project.id).length;

  return (
    <section className="border-b border-blue-100 bg-[linear-gradient(90deg,#EAF3FF_0%,#F8FBFF_100%)] px-4 py-3 text-[#071B33]" aria-label="Projet de recherche actif">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            <Search size={14} aria-hidden="true" /> Projet actif
          </div>
          <p className="mt-1 truncate text-sm font-extrabold sm:text-base">{project.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">Les critères de ce projet pilotent cette recherche. Les favoris et comparaisons restent rattachés au même parcours.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"><Heart size={13} className="text-[#0B63CE]" />{favoriteCount} favori{favoriteCount === 1 ? "" : "s"}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"><GitCompare size={13} className="text-[#0B63CE]" />{comparisonCount} comparaison{comparisonCount === 1 ? "" : "s"}</span>
          <Link href="/mon-projet/espace" className="inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#084FA8]"><SlidersHorizontal size={14} />Gérer le projet</Link>
        </div>
      </div>
    </section>
  );
}
