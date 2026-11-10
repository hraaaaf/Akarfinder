import { isPrivateQaLoopbackRequest } from "./private-qa-host-guard.mjs";

/** Review-only HTTP gate, deliberately impossible on a production Next runtime. */
export function allowJ18LocalReview({
  nodeEnv, optIn, urlHostname, hostHeader, forwardedHostHeader,
  datasetDirectory, sourceSha, requestMethod = "GET",
}) {
  return nodeEnv === "development" && optIn === "true" &&
    requestMethod === "GET" &&
    isPrivateQaLoopbackRequest(urlHostname, hostHeader, forwardedHostHeader) &&
    typeof datasetDirectory === "string" && datasetDirectory.length > 0 &&
    typeof sourceSha === "string" && /^[a-f0-9]{64}$/.test(sourceSha);
}
