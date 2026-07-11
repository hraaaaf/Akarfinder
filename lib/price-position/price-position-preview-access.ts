export type PricePositionPreviewAccessEnv = Partial<
  Pick<NodeJS.ProcessEnv, "VERCEL_ENV" | "PRICE_POSITION_PREVIEW_DEMO_ENABLED">
>;

const DEFAULT_PRICE_POSITION_PREVIEW_ACCESS_ENV =
  process.env as unknown as PricePositionPreviewAccessEnv;

export function canAccessPricePositionPreviewDemo(
  env: PricePositionPreviewAccessEnv = DEFAULT_PRICE_POSITION_PREVIEW_ACCESS_ENV,
): boolean {
  return env.VERCEL_ENV === "preview" && env.PRICE_POSITION_PREVIEW_DEMO_ENABLED === "true";
}

export function ensurePricePositionPreviewDemoAccess(
  env: PricePositionPreviewAccessEnv = DEFAULT_PRICE_POSITION_PREVIEW_ACCESS_ENV,
): void {
  if (!canAccessPricePositionPreviewDemo(env)) {
    throw new Error("PRICE_POSITION_PREVIEW_DEMO_NOT_FOUND");
  }
}
