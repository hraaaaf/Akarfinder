import { resolveCasablancaRealPhoto } from "./casablanca-real-photo-library";
import { resolveRabatRealPhoto } from "./rabat-real-photo-library";

export type RealNeighborhoodPhotoInput = {
  stableKey: string;
  city?: string | null;
  district?: string | null;
};

export function resolveRealNeighborhoodPhoto(input: RealNeighborhoodPhotoInput) {
  return resolveRabatRealPhoto(input) ?? resolveCasablancaRealPhoto(input);
}
