export type IndexedTransactionVisualKey = "buy" | "rent" | "new" | "unknown";

export type IndexedTransactionVisual = {
  key: IndexedTransactionVisualKey;
  label: "Achat" | "Location" | "Neuf" | "Annonce indexée";
  background: string;
  foreground: string;
  accent: string;
};

const VISUALS: Record<IndexedTransactionVisualKey, IndexedTransactionVisual> = {
  buy: {
    key: "buy",
    label: "Achat",
    background: "#FFFBF7",
    foreground: "#C2410C",
    accent: "#F97316",
  },
  rent: {
    key: "rent",
    label: "Location",
    background: "#F8FBFF",
    foreground: "#1D4ED8",
    accent: "#2563EB",
  },
  new: {
    key: "new",
    label: "Neuf",
    background: "#F7FCF9",
    foreground: "#15803D",
    accent: "#22A447",
  },
  unknown: {
    key: "unknown",
    label: "Annonce indexée",
    background: "#F8FAFC",
    foreground: "#334155",
    accent: "#64748B",
  },
};

export function getIndexedTransactionVisual(
  transaction: string | null | undefined,
): IndexedTransactionVisual {
  if (transaction === "buy" || transaction === "rent" || transaction === "new") {
    return VISUALS[transaction];
  }

  return VISUALS.unknown;
}
