function parseBooleanEnv(value: string | undefined | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function isPricePositionReferenceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const serverValue = parseBooleanEnv(env.PRICE_POSITION_REFERENCE_ENABLED);
  if (serverValue !== null) return serverValue;

  const publicValue = parseBooleanEnv(env.NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED);
  if (publicValue !== null) return publicValue;

  return false;
}
