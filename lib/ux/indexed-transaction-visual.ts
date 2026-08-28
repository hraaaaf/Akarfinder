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
    background: "#FFF1E7",
    foreground: "#9A3412",
    accent: "#F97316",
  },
  rent: {
    key: "rent",
    label: "Location",
    background: "#EAF1FF",
    foreground: "#1D4ED8",
    accent: "#2563EB",
  },
  new: {
    key: "new",
    label: "Neuf",
    background: "#EAFBF3",
    foreground: "#047857",
    accent: "#10B981",
  },
  unknown: {
    key: "unknown",
    label: "Annonce indexée",
    background: "#F1F5F9",
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
