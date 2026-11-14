/** Defense-in-depth host check; local-only dev binding is also required. */
export function isPrivateQaLoopbackRequest(
  urlHostname: string,
  hostHeader: string | null,
  forwardedHostHeader: string | null,
): boolean;
