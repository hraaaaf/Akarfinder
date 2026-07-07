import {
  PUBLIC_RESULT_CHECKLIST_HELP_LABEL,
  PUBLIC_RESULT_CHECKLIST_MAX_ITEMS,
  PUBLIC_RESULT_CHECKLIST_TITLE,
} from "./checklist-rules";
import type {
  PublicResultChecklistInput,
  PublicResultChecklistItem,
  PublicResultChecklistSummary,
} from "./types";

const MIN_MEANINGFUL_SNIPPET_LENGTH = 20;

function hasLimitedInformation(input: PublicResultChecklistInput): boolean {
  const snippetLength = input.snippet?.trim().length ?? 0;
  return snippetLength < MIN_MEANINGFUL_SNIPPET_LENGTH;
}

/**
 * Builds a short, non-accusatory checklist for a public result. Never
 * certifies, scores, or judges the listing — only points to what a user
 * can compare or confirm on the original source before contacting.
 */
export function buildPublicResultChecklist(
  input: PublicResultChecklistInput,
): PublicResultChecklistSummary | null {
  if (!input.title || !input.original_url) {
    return null;
  }

  const items: PublicResultChecklistItem[] = [];

  items.push(
    hasLimitedInformation(input)
      ? {
          category: "source",
          label:
            "Informations limitées : vérifiez les détails complets sur la source originale.",
        }
      : {
          category: "source",
          label: "Vérifier que les informations correspondent sur la source originale.",
        },
  );

  if (input.observation_labels && input.observation_labels.length > 0) {
    items.push({
      category: "freshness",
      label: "Observation AkarFinder : à confirmer sur la source originale.",
    });
  }

  if (input.similar_possible) {
    items.push({
      category: "similarity",
      label: "Comparer avec les résultats similaires possibles.",
    });
  }

  items.push({
    category: "price",
    label: "Comparer le prix affiché avec d'autres résultats proches.",
  });

  items.push({
    category: "surface",
    label:
      "Confirmer la surface, l'étage et les charges si elles sont importantes pour vous.",
  });

  items.push({
    category: "photos",
    label: "Vérifier les photos et l'adresse exacte sur la source originale.",
  });

  return {
    title: PUBLIC_RESULT_CHECKLIST_TITLE,
    help_label: PUBLIC_RESULT_CHECKLIST_HELP_LABEL,
    items: items.slice(0, PUBLIC_RESULT_CHECKLIST_MAX_ITEMS),
  };
}
