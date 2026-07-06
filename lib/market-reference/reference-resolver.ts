import { MOROCCO_REFERENCE_DATASET } from "@/lib/market-reference/morocco-reference-data";
import type {
  CityReference,
  DistrictReference,
  MoroccoReferenceDataset,
} from "@/lib/market-reference/types";

export function getInternalDistrictReference(
  districtId: string,
  dataset: MoroccoReferenceDataset = MOROCCO_REFERENCE_DATASET,
): DistrictReference | null {
  return (
    dataset.district_reference.find(
      (districtReference) => districtReference.id === districtId,
    ) ?? null
  );
}

export function getInternalDistrictReferenceByCityAndDistrict(
  city: string,
  district: string,
  dataset: MoroccoReferenceDataset = MOROCCO_REFERENCE_DATASET,
): DistrictReference | null {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedDistrict = district.trim().toLowerCase();

  return (
    dataset.district_reference.find((districtReference) => {
      const districtMatches =
        districtReference.district.toLowerCase() === normalizedDistrict ||
        districtReference.aliases.some(
          (alias) => alias.toLowerCase() === normalizedDistrict,
        );

      return (
        districtReference.city.toLowerCase() === normalizedCity && districtMatches
      );
    }) ?? null
  );
}

export function getInternalCityReference(
  cityId: string,
  dataset: MoroccoReferenceDataset = MOROCCO_REFERENCE_DATASET,
): CityReference | null {
  return dataset.cities.find((cityReference) => cityReference.id === cityId) ?? null;
}
