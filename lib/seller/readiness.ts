export type SellerIntent = "publish" | "estimate" | "professional";

export type SellerReadinessInput = {
  city?: string;
  neighborhood?: string;
  propertyType?: string;
  surface?: number;
  bedrooms?: number;
  condition?: string;
  price?: number;
  description?: string;
  phone?: string;
  photoCount?: number;
  acceptedPhotoCount?: number;
};

export type SellerSuggestion = {
  key: string;
  label: string;
  gain: number;
};

export type SellerReadiness = {
  score: number;
  label: "À démarrer" | "Bien avancée" | "Presque prête" | "Très complète";
  suggestions: SellerSuggestion[];
  essentialsComplete: boolean;
};

const clean = (value?: string) => value?.trim() ?? "";

export function calculateSellerReadiness(input: SellerReadinessInput): SellerReadiness {
  let score = 0;
  const suggestions: SellerSuggestion[] = [];

  const add = (complete: boolean, points: number, key: string, label: string) => {
    if (complete) score += points;
    else suggestions.push({ key, label, gain: points });
  };

  add(Boolean(clean(input.propertyType)), 12, "propertyType", "Préciser le type de bien");
  add(Boolean(clean(input.city)), 12, "city", "Ajouter la ville");
  add(Boolean(clean(input.neighborhood)), 8, "neighborhood", "Ajouter le quartier");
  add(Number(input.surface) > 0, 12, "surface", "Ajouter la surface");
  add(Number(input.bedrooms) >= 0 && input.bedrooms !== undefined, 6, "bedrooms", "Préciser le nombre de chambres");
  add(Boolean(clean(input.condition)), 7, "condition", "Indiquer l’état du bien");
  add(Number(input.price) > 0, 8, "price", "Ajouter le prix souhaité");
  add(clean(input.description).length >= 80, 10, "description", "Décrire les points forts du bien");
  add(clean(input.phone).replace(/[\s\-().]/g, "").length >= 8, 8, "phone", "Ajouter un numéro de contact");

  const photoCount = Math.max(0, input.photoCount ?? 0);
  const acceptedPhotoCount = Math.max(0, input.acceptedPhotoCount ?? 0);
  add(photoCount >= 3, 5, "photos", "Ajouter au moins 3 photos");
  add(acceptedPhotoCount >= 3, 7, "photoQuality", "Choisir des photos nettes et suffisamment grandes");
  add(acceptedPhotoCount >= 6, 5, "photoVariety", "Montrer plusieurs pièces et l’extérieur");

  score = Math.min(100, score);
  const essentialsComplete =
    Boolean(clean(input.propertyType)) &&
    Boolean(clean(input.city)) &&
    Number(input.surface) > 0 &&
    clean(input.phone).replace(/[\s\-().]/g, "").length >= 8;

  const label =
    score >= 85 ? "Très complète" :
    score >= 70 ? "Presque prête" :
    score >= 45 ? "Bien avancée" :
    "À démarrer";

  return {
    score,
    label,
    essentialsComplete,
    suggestions: suggestions.sort((a, b) => b.gain - a.gain).slice(0, 4),
  };
}
