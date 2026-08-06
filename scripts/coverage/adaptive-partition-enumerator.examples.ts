import { districtStrategy, numericRangeStrategy } from "./adaptive-partition-enumerator";

// Canonical ordering only. Source adapters must prove that each dimension maps
// to a real public filter before using it in live enumeration.
export const DEFAULT_PARTITION_STRATEGIES = {
  districts: (values: string[]) => districtStrategy(values),
  price: () => numericRangeStrategy("price", [500_000, 1_000_000, 1_500_000, 2_500_000, 5_000_000]),
  surface: () => numericRangeStrategy("surface", [50, 80, 120, 180, 300]),
  rooms: () => numericRangeStrategy("rooms", [1, 2, 3, 4]),
};
