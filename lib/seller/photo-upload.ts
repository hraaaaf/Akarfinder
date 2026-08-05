import { createHash, randomBytes } from "node:crypto";

export const SELLER_PHOTO_BUCKET = "seller-property-drafts";
export const SELLER_PHOTO_MAX_COUNT = 12;
export const SELLER_PHOTO_MAX_BYTES = 15 * 1024 * 1024;
export const SELLER_PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type SellerPhotoDescriptor = {
  name: string;
  size: number;
  type: string;
};

export function createSellerUploadToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSellerUploadToken(token) };
}

export function hashSellerUploadToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function validateSellerPhotoBatch(input: unknown):
  | { ok: true; photos: SellerPhotoDescriptor[] }
  | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "Ajoutez au moins une photo." };
  }
  if (input.length > SELLER_PHOTO_MAX_COUNT) {
    return { ok: false, error: `Vous pouvez envoyer jusqu’à ${SELLER_PHOTO_MAX_COUNT} photos.` };
  }

  const photos: SellerPhotoDescriptor[] = [];
  for (const value of input) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "Description de photo invalide." };
    }
    const row = value as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const size = typeof row.size === "number" ? row.size : NaN;
    const type = typeof row.type === "string" ? row.type : "";
    if (!name || name.length > 180 || !Number.isInteger(size) || size <= 0 || size > SELLER_PHOTO_MAX_BYTES) {
      return { ok: false, error: "Une photo dépasse les limites autorisées." };
    }
    if (!SELLER_PHOTO_ALLOWED_TYPES.includes(type as (typeof SELLER_PHOTO_ALLOWED_TYPES)[number])) {
      return { ok: false, error: "Formats acceptés : JPG, PNG ou WebP." };
    }
    photos.push({ name, size, type });
  }
  return { ok: true, photos };
}

export function extensionForSellerPhoto(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
