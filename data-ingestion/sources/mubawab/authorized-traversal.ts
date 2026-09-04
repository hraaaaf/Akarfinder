export type AuthorizedLeafStatus =
  | "complete_on_first_page"
  | "overflow_requires_disallowed_pagination"
  | "empty"
  | "unproven";

export type AuthorizedLeafEvidence = {
  url: string;
  family: string;
  total_results: number | null;
  first_page_unit_ids: string[];
  robots_allowed: boolean;
};

export type AuthorizedLeafAssessment = AuthorizedLeafEvidence & {
  first_page_unique_units: number;
  status: AuthorizedLeafStatus;
  unexplained_lower_bound: number | null;
};

export function assessAuthorizedLeaf(input: AuthorizedLeafEvidence): AuthorizedLeafAssessment {
  const unique = [...new Set(input.first_page_unit_ids)];
  const firstPageUniqueUnits = unique.length;

  if (!input.robots_allowed) {
    return {
      ...input,
      first_page_unit_ids: unique,
      first_page_unique_units: firstPageUniqueUnits,
      status: "unproven",
      unexplained_lower_bound: input.total_results,
    };
  }

  if (input.total_results === 0) {
    return {
      ...input,
      first_page_unit_ids: unique,
      first_page_unique_units: firstPageUniqueUnits,
      status: "empty",
      unexplained_lower_bound: 0,
    };
  }

  if (input.total_results == null) {
    return {
      ...input,
      first_page_unit_ids: unique,
      first_page_unique_units: firstPageUniqueUnits,
      status: "unproven",
      unexplained_lower_bound: null,
    };
  }

  if (firstPageUniqueUnits >= input.total_results) {
    return {
      ...input,
      first_page_unit_ids: unique,
      first_page_unique_units: firstPageUniqueUnits,
      status: "complete_on_first_page",
      unexplained_lower_bound: 0,
    };
  }

  return {
    ...input,
    first_page_unit_ids: unique,
    first_page_unique_units: firstPageUniqueUnits,
    status: "overflow_requires_disallowed_pagination",
    unexplained_lower_bound: Math.max(0, input.total_results - firstPageUniqueUnits),
  };
}

export function summarizeAuthorizedLeaves(items: AuthorizedLeafAssessment[]) {
  return {
    leaves_total: items.length,
    complete_on_first_page: items.filter((item) => item.status === "complete_on_first_page").length,
    overflow: items.filter((item) => item.status === "overflow_requires_disallowed_pagination").length,
    empty: items.filter((item) => item.status === "empty").length,
    unproven: items.filter((item) => item.status === "unproven").length,
    observed_unit_ids: new Set(items.flatMap((item) => item.first_page_unit_ids)).size,
    unexplained_lower_bound: items.reduce(
      (sum, item) => sum + (item.unexplained_lower_bound ?? 0),
      0,
    ),
  };
}
