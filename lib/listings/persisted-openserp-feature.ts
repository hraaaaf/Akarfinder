function parseBooleanEnv(value: string | undefined | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function isPersistedOpenSerpListingsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const serverValue = parseBooleanEnv(env.PERSISTED_OPENSERP_LISTINGS_ENABLED);
  if (serverValue !== null) return serverValue;
  return false;
}
