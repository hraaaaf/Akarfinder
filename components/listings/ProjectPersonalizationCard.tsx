"use client";

import Link from "next/link";
import { AlertTriangle, Check, HelpCircle, Route, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Listing } from "@/lib/listings/types";
import { buildProjectFitModel, type ProjectFitReason } from "@/lib/property-detail/project-fit";
import type { ProjectRoute, ProjectRoutesModel } from "@/lib/property-detail/project-routes";
import { parseDynamicSearchProfileV2 } from "@/lib/search-profile-v2/parse";
import type { DynamicSearchProfileV2 } from "@/lib/search-profile-v2/types";

type ProjectView = {
  id: string;
  name: string;
  profile: DynamicSearchProfileV2;
};

type ContinuityResponse = {
  projects?: unknown[];
};

function parseProject(value: unknown, projectId: string): ProjectView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.id !== projectId || typeof row.name !== "string" || !row.name.trim()) return null;
  const profile = parseDynamicSearchProfileV2(row.profile);
  return profile ? { id: projectId, name: row.name.trim(), profile } : null;
}

function ReasonIcon({ status }: { status: ProjectFitReason["status"] }) {
  if (status === "match") return <Check size={14} className="text-emerald-600" aria-hidden="true" />;
  if (status === "mismatch") return <AlertTriangle size={14} className="text-amber-600" aria-hidden="true" />;
  return <HelpCircle size={14} className="text-slate-400" aria-hidden="true" />;
}

function routeLabel(route: ProjectRoute): string {
  const minutes = route.durationSeconds == null ? null : Math.max(1, Math.round(route.durationSeconds / 60));
  if (minutes == null) return route.mode === "driving" ? "voiture non calculée" : "à pied non calculé";
  return route.mode === "driving" ? `${minutes} min en voiture` : `${minutes} min à pied`;
}

function groupedRoutes(model: ProjectRoutesModel | null, profile: DynamicSearchProfileV2) {
  return profile.location.anchors.map((anchor) => {
    const routes = (model?.routes ?? []).filter((route) => route.label === anchor.label && route.status === "measured");
    return { anchor, routes };
  });
}

export function ProjectPersonalizationCard({
  listing,
  projectId,
  compactRail = false,
}: {
  listing: Listing;
  projectId?: string | null;
  compactRail?: boolean;
}) {
  const [project, setProject] = useState<ProjectView | null>(null);
  const [routes, setRoutes] = useState<ProjectRoutesModel | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setRoutes(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/me/continuity", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json() as ContinuityResponse;
        const candidate = Array.isArray(payload.projects)
          ? payload.projects.map((item) => parseProject(item, projectId)).find(Boolean) ?? null
          : null;
        return candidate;
      })
      .then((candidate) => {
        if (!cancelled) setProject(candidate);
      })
      .catch(() => {
        if (!cancelled) setProject(null);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !project || project.profile.location.anchors.length === 0) {
      setRoutes(null);
      setLoadingRoutes(false);
      return;
    }
    let cancelled = false;
    setLoadingRoutes(true);
    void fetch("/api/me/project-routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: projectId, listing_id: listing.id }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json() as { routes?: ProjectRoutesModel };
        return payload.routes ?? null;
      })
      .then((model) => {
        if (!cancelled) setRoutes(model);
      })
      .catch(() => {
        if (!cancelled) setRoutes(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoutes(false);
      });
    return () => { cancelled = true; };
  }, [listing.id, project, projectId]);

  const fit = useMemo(() => project ? buildProjectFitModel(project.profile, listing) : null, [listing, project]);
  if (!project || (!fit?.available && project.profile.location.anchors.length === 0)) return null;

  const visibleReasons = fit
    ? compactRail
      ? [...fit.reasons.filter((reason) => reason.status === "mismatch"), ...fit.reasons.filter((reason) => reason.status !== "mismatch")].slice(0, 3)
      : fit.reasons.slice(0, 6)
    : [];
  const routeGroups = groupedRoutes(routes, project.profile).slice(0, compactRail ? 2 : undefined);
  const measuredRoutes = routes?.routes.filter((route) => route.status === "measured") ?? [];
  const attributions = [...new Set(measuredRoutes.map((route) => route.attribution).filter((value): value is string => Boolean(value)))];

  return (
    <section
      data-project-personalization="ann-l12"
      className={`overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.07)] ${compactRail ? "mt-0" : "mt-6"}`}
    >
      <div className={compactRail ? "p-5" : "p-5 sm:p-6"}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">
              <Sparkles size={14} aria-hidden="true" /> Mon Projet · <span className="truncate">{project.name}</span>
            </p>
            <h2 className={`${compactRail ? "mt-1.5 text-[1.05rem]" : "mt-2 text-[1.15rem]"} font-extrabold tracking-[-0.03em] text-[#0B2545]`}>Ce bien face à vos critères</h2>
          </div>
          {fit?.score != null ? (
            <div className={`shrink-0 rounded-2xl border border-blue-100 bg-blue-50 text-center ${compactRail ? "px-2.5 py-1.5" : "px-3 py-2"}`} aria-label={`Compatibilité ${fit.score} sur 100`}>
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">Fit</span>
              <span className={`${compactRail ? "text-base" : "text-lg"} block font-black tracking-[-0.04em] text-[#0B2545]`}>{fit.score}/100</span>
            </div>
          ) : null}
        </div>

        {fit ? (
          <p className={`${compactRail ? "mt-2 text-[11.5px]" : "mt-3 text-[12.5px]"} font-semibold text-slate-500`}>
            {fit.evaluatedCount > 0
              ? `${fit.matchedCount} critère${fit.matchedCount > 1 ? "s" : ""} compatible${fit.matchedCount > 1 ? "s" : ""}${fit.mismatchCount > 0 ? ` · ${fit.mismatchCount} écart${fit.mismatchCount > 1 ? "s" : ""}` : ""}`
              : "Critères comparables insuffisants pour calculer un score global."}
          </p>
        ) : null}

        {visibleReasons.length > 0 ? (
          <div className={`${compactRail ? "mt-3" : "mt-4"} divide-y divide-slate-100 border-y border-slate-100`}>
            {visibleReasons.map((item, index) => (
              <div key={`${item.key}-${item.label}-${index}`} className={`flex items-start gap-3 ${compactRail ? "min-h-10 py-2" : "min-h-11 py-2.5"}`}>
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-50"><ReasonIcon status={item.status} /></span>
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold text-[#0B2545]">{item.label}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {project.profile.location.anchors.length > 0 ? (
          <div className={compactRail ? "mt-4" : "mt-5"}>
            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              <Route size={14} aria-hidden="true" /> Vos trajets
            </p>
            <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/55 px-3">
              {routeGroups.map(({ anchor, routes: anchorRoutes }) => (
                <div key={anchor.label} className={`flex items-center justify-between gap-3 ${compactRail ? "min-h-10 py-2" : "min-h-12 py-2.5"}`}>
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-extrabold text-[#0B2545]">{anchor.label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {loadingRoutes
                        ? "Calcul du trajet mesuré…"
                        : anchorRoutes.length > 0
                          ? anchorRoutes.map(routeLabel).join(" · ")
                          : "Trajet non calculé"}
                    </p>
                  </div>
                  {anchor.max_minutes != null && anchorRoutes.some((route) => route.withinTarget != null) ? (
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ${anchorRoutes.some((route) => route.withinTarget === true) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      cible {anchor.max_minutes} min
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            {!compactRail && attributions.length > 0 ? <p className="mt-2 text-[9.5px] text-slate-400">Trajets mesurés · {attributions.join(" · ")}</p> : null}
          </div>
        ) : null}

        <div className={`${compactRail ? "mt-4 pt-3" : "mt-5 pt-4"} border-t border-slate-100`}>
          <Link href="/mon-projet/espace" className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3.5 text-[11.5px] font-extrabold text-[#0B63CE] transition hover:border-blue-200 hover:bg-blue-50 motion-reduce:transition-none">
            Modifier Mon Projet
          </Link>
        </div>
      </div>
    </section>
  );
}
