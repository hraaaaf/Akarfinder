import { writeFile } from "node:fs/promises";
import { fetchAuthorizedSource, MUBAWAB_CONTROLLED_POLICY } from "../../lib/recrawl/authorized-source-adapter.js";

const TARGET_URL = process.env.AUTHORIZED_SOURCE_CANARY_URL
  ?? "https://www.mubawab.ma/fr/a/8281326/beau-terrain-en-location-%C3%A0-ben-guerir-surface-de-3200-m%C2%B2";
const REPORT_PATH = process.env.AUTHORIZED_SOURCE_REPORT_PATH ?? "authorized-source-canary-report.json";

function robotsAllowsDetail(robots: string, path: string): boolean {
  const normalized = robots.replace(/\r/g, "");
  const groups = normalized.split(/(?=User-agent\s*:)/i);
  const wildcard = groups.filter((group) => /User-agent\s*:\s*\*/i.test(group)).join("\n");
  const disallows = [...wildcard.matchAll(/^\s*Disallow\s*:\s*(.*?)\s*$/gim)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
  return !disallows.some((rule) => {
    if (rule === "/") return true;
    if (!rule) return false;
    const prefix = rule.replace(/\*.*$/, "");
    return prefix.length > 0 && path.startsWith(prefix);
  });
}

async function main(): Promise<void> {
  const target = new URL(TARGET_URL);
  const robotsUrl = `${target.origin}/robots.txt`;
  const robotsResponse = await fetch(robotsUrl, {
    headers: { "user-agent": MUBAWAB_CONTROLLED_POLICY.userAgent, accept: "text/plain" },
    redirect: "error",
  });
  const robotsText = await robotsResponse.text();
  if (!robotsResponse.ok) throw new Error(`robots_fetch_failed_${robotsResponse.status}`);
  if (!robotsAllowsDetail(robotsText, target.pathname)) throw new Error("robots_detail_path_disallowed");

  const observation = await fetchAuthorizedSource({
    policy: MUBAWAB_CONTROLLED_POLICY,
    url: target.toString(),
  });
  if (observation.httpStatus !== 200) throw new Error(`canary_http_${observation.httpStatus}`);
  if (!observation.contentType?.toLowerCase().includes("text/html")) throw new Error("canary_non_html");
  if (!observation.title || observation.bytesRead < 500) throw new Error("canary_insufficient_page_evidence");

  const report = {
    verdict: "CONTROLLED_FETCH_PROVED",
    policy: {
      source_key: MUBAWAB_CONTROLLED_POLICY.sourceKey,
      path_allowed_by_adapter: true,
      path_allowed_by_robots: true,
      redirect_mode: "error",
      max_response_bytes: MUBAWAB_CONTROLLED_POLICY.maxResponseBytes,
      timeout_ms: MUBAWAB_CONTROLLED_POLICY.timeoutMs,
    },
    observation,
    persistence: "disabled",
    publication_eligible: false,
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch(async (error) => {
  const report = {
    verdict: "CONTROLLED_FETCH_NOT_PROVED",
    error: error instanceof Error ? error.message : String(error),
    persistence: "disabled",
    publication_eligible: false,
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(JSON.stringify(report));
  process.exitCode = 1;
});
