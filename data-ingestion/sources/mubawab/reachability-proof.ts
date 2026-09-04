import { extractListingRefs } from "./discovery";

export type ReachabilitySurface = {
  id: string;
  family: "ct" | "is" | "cc" | "t" | "st" | "sc" | "vacation_st";
  role: "control" | "primary_harvest";
  url: string;
};

export type ReachabilityObservation = {
  id: string;
  family: ReachabilitySurface["family"];
  role: ReachabilitySurface["role"];
  url: string;
  unique_ids: string[];
};

export type ReachabilityVerdict = {
  control_id: string;
  control_family: "ct" | "is" | "cc" | "t";
  control_unique_ids: number;
  explained_ids: number;
  unexplained_ids: number;
  overlap_ratio: number | null;
  unexplained_source_ids: string[];
  verdict: "alias_or_control" | "inventory_bearing_residual" | "empty";
};

export function observeSurface(surface: ReachabilitySurface, html: string): ReachabilityObservation {
  const ids = extractListingRefs(html, surface.url).map((ref) => ref.source_id);
  return { ...surface, unique_ids: [...new Set(ids)] };
}

export function evaluateReachability(observations: ReachabilityObservation[]): ReachabilityVerdict[] {
  const primaryIds = new Set(
    observations.filter((item) => item.role === "primary_harvest").flatMap((item) => item.unique_ids),
  );

  return observations
    .filter((item): item is ReachabilityObservation & { family: "ct" | "is" | "cc" | "t" } => item.role === "control")
    .map((control) => {
      const unexplained = control.unique_ids.filter((id) => !primaryIds.has(id));
      const explained = control.unique_ids.length - unexplained.length;
      const ratio = control.unique_ids.length === 0 ? null : explained / control.unique_ids.length;
      return {
        control_id: control.id,
        control_family: control.family,
        control_unique_ids: control.unique_ids.length,
        explained_ids: explained,
        unexplained_ids: unexplained.length,
        overlap_ratio: ratio,
        unexplained_source_ids: unexplained,
        verdict:
          control.unique_ids.length === 0
            ? "empty"
            : unexplained.length === 0
              ? "alias_or_control"
              : "inventory_bearing_residual",
      };
    });
}
