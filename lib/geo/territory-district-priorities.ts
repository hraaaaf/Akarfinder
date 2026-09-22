import {
  GEO_NEIGHBORHOODS,
  type CanonicalCitySlug,
  type CanonicalNeighborhoodEntity,
} from "./geo-entity-registry";
import type { TerritoryImportanceTier } from "./territory-dictionary";

export type DistrictPriorityPolicy = {
  score: number;
  tier: TerritoryImportanceTier;
  minZoom: number;
  retainPriority: boolean;
};

/**
 * Editorial reveal priority for the map.
 *
 * This is not a claim about population, wealth, safety or objective quality.
 * It only defines which already-canonical district labels AkarFinder keeps
 * visible first during map exploration.
 */
export const DISTRICT_PRIORITY_OVERRIDES: Readonly<Record<string, DistrictPriorityPolicy>> = {
  // Casablanca
  district_casablanca_maarif: { score: 100, tier: "flagship", minZoom: 9.4, retainPriority: true },
  district_casablanca_ain_diab: { score: 96, tier: "flagship", minZoom: 9.6, retainPriority: true },
  district_casablanca_racine: { score: 93, tier: "major", minZoom: 9.8, retainPriority: true },
  district_casablanca_finance_city: { score: 91, tier: "major", minZoom: 9.8, retainPriority: true },
  district_casablanca_bourgogne: { score: 86, tier: "major", minZoom: 10.2, retainPriority: false },
  district_casablanca_bouskoura: { score: 78, tier: "regional", minZoom: 10.8, retainPriority: false },
  district_casablanca_hay_hassani: { score: 72, tier: "local", minZoom: 11.2, retainPriority: false },
  district_casablanca_sidi_maarouf: { score: 74, tier: "local", minZoom: 11.1, retainPriority: false },
  district_casablanca_californie: { score: 76, tier: "local", minZoom: 11.0, retainPriority: false },

  // Rabat
  district_rabat_agdal: { score: 100, tier: "flagship", minZoom: 9.4, retainPriority: true },
  district_rabat_hay_riad: { score: 97, tier: "flagship", minZoom: 9.6, retainPriority: true },
  district_rabat_souissi: { score: 94, tier: "major", minZoom: 9.8, retainPriority: true },
  district_rabat_hassan: { score: 90, tier: "major", minZoom: 10.0, retainPriority: true },
  district_rabat_ocean: { score: 82, tier: "regional", minZoom: 10.5, retainPriority: false },

  // Salé — editorial reveal only; not a ranking of neighborhood quality.
  district_sale_bab_lamrissa: { score: 92, tier: "major", minZoom: 9.9, retainPriority: true },
  district_sale_tabriquet: { score: 90, tier: "major", minZoom: 10.0, retainPriority: true },
  district_sale_bettana: { score: 88, tier: "major", minZoom: 10.2, retainPriority: false },
  district_sale_laayayda: { score: 80, tier: "regional", minZoom: 10.7, retainPriority: false },
  district_sale_hssaine: { score: 80, tier: "regional", minZoom: 10.7, retainPriority: false },

  // Témara — editorial reveal only; identity is canonical, boundary is unpublished.
  district_temara_hay_al_wifaq: { score: 92, tier: "major", minZoom: 9.9, retainPriority: true },
  district_temara_oulad_mtaa: { score: 90, tier: "major", minZoom: 10.0, retainPriority: true },
  district_temara_massira_1: { score: 86, tier: "major", minZoom: 10.2, retainPriority: false },
  district_temara_ibnou_rochd: { score: 84, tier: "regional", minZoom: 10.4, retainPriority: false },
  district_temara_hay_al_maghreb_al_arabi: { score: 82, tier: "regional", minZoom: 10.5, retainPriority: false },

  // Marrakech
  district_marrakech_gueliz: { score: 100, tier: "flagship", minZoom: 9.4, retainPriority: true },
  district_marrakech_hivernage: { score: 97, tier: "flagship", minZoom: 9.6, retainPriority: true },
  district_marrakech_ourika: { score: 82, tier: "regional", minZoom: 10.6, retainPriority: false },

  // Tanger
  district_tanger_malabata: { score: 97, tier: "flagship", minZoom: 9.6, retainPriority: true },
  district_tanger_ville_nouvelle: { score: 90, tier: "major", minZoom: 10.0, retainPriority: true },
  district_tanger_marchan: { score: 86, tier: "major", minZoom: 10.3, retainPriority: false },

  // Agadir
  district_agadir_founty: { score: 97, tier: "flagship", minZoom: 9.6, retainPriority: true },
  district_agadir_talborjt: { score: 88, tier: "major", minZoom: 10.2, retainPriority: false },

  // Meknès
  district_meknes_hamria: { score: 96, tier: "flagship", minZoom: 9.6, retainPriority: true },
  district_meknes_ancienne_medina: { score: 94, tier: "major", minZoom: 9.8, retainPriority: true },
  district_meknes_marjane: { score: 90, tier: "major", minZoom: 10.0, retainPriority: true },
  district_meknes_ryad: { score: 84, tier: "regional", minZoom: 10.4, retainPriority: false },
  district_meknes_zitoune: { score: 82, tier: "regional", minZoom: 10.5, retainPriority: false },

  // Tétouan
  district_tetouan_medina: { score: 100, tier: "flagship", minZoom: 9.4, retainPriority: true },
  district_tetouan_ensanche: { score: 96, tier: "flagship", minZoom: 9.6, retainPriority: true },

  // Oujda
  district_oujda_centre_ville: { score: 96, tier: "flagship", minZoom: 9.6, retainPriority: true },
  district_oujda_hay_el_qods: { score: 90, tier: "major", minZoom: 10.0, retainPriority: true },
  district_oujda_hay_al_massira: { score: 88, tier: "major", minZoom: 10.2, retainPriority: false },
  district_oujda_hay_al_andalous: { score: 84, tier: "regional", minZoom: 10.4, retainPriority: false },
  district_oujda_hay_boudir: { score: 82, tier: "regional", minZoom: 10.5, retainPriority: false },

  // Fès
  district_fes_el_bali: { score: 100, tier: "flagship", minZoom: 9.4, retainPriority: true },
  district_fes_ville_nouvelle: { score: 88, tier: "major", minZoom: 10.2, retainPriority: false },

  // Kénitra / Mohammedia
  district_kenitra_centre_ville: { score: 90, tier: "major", minZoom: 10.0, retainPriority: true },
  district_mohammedia_centre: { score: 90, tier: "major", minZoom: 10.0, retainPriority: true },
};

const DEFAULT_POLICY: DistrictPriorityPolicy = {
  score: 65,
  tier: "local",
  minZoom: 11.5,
  retainPriority: false,
};

export function getDistrictPriority(entity: CanonicalNeighborhoodEntity): DistrictPriorityPolicy {
  return DISTRICT_PRIORITY_OVERRIDES[entity.id] ?? DEFAULT_POLICY;
}

export function getPrioritizedDistrictsForCity(citySlug: CanonicalCitySlug): CanonicalNeighborhoodEntity[] {
  return GEO_NEIGHBORHOODS
    .filter((district) => district.city_slug === citySlug)
    .sort((a, b) => {
      const scoreDelta = getDistrictPriority(b).score - getDistrictPriority(a).score;
      if (scoreDelta !== 0) return scoreDelta;
      return a.canonical_name.localeCompare(b.canonical_name, "fr");
    });
}

export function getDistrictsVisibleAtZoom(
  citySlug: CanonicalCitySlug,
  zoom: number,
): CanonicalNeighborhoodEntity[] {
  return getPrioritizedDistrictsForCity(citySlug).filter(
    (district) => zoom >= getDistrictPriority(district).minZoom,
  );
}
