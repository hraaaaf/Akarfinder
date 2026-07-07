export type PublicResultChecklistCategory =
  | "source"
  | "price"
  | "surface"
  | "location"
  | "photos"
  | "freshness"
  | "similarity";

export type PublicResultChecklistItem = {
  category: PublicResultChecklistCategory;
  label: string;
};

export type PublicResultChecklistSummary = {
  title: "Points à vérifier";
  help_label: "Avant de contacter";
  items: PublicResultChecklistItem[];
};

export type PublicResultChecklistInput = {
  title?: string;
  snippet?: string;
  original_url?: string;
  similar_possible?: boolean;
  observation_labels?: string[];
};
