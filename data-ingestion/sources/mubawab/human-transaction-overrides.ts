import type { DiscoveryTransaction } from "../../transaction-context";

type HumanTransactionOverride = {
  transaction: DiscoveryTransaction;
  rationale: string;
};

const HUMAN_TRANSACTION_OVERRIDES: Record<string, HumanTransactionOverride> = {
  "8408402": {
    transaction: "rent",
    rationale: "User-confirmed Lot 6 arbitration for on-request commercial depot discovered on commercial_rent route.",
  },
};

export function getMubawabHumanTransactionOverride(sourceId: string): HumanTransactionOverride | null {
  return HUMAN_TRANSACTION_OVERRIDES[sourceId] ?? null;
}
