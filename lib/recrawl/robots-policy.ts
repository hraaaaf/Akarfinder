export type RobotsRule = {
  directive: "allow" | "disallow";
  pattern: string;
};

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function ruleRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const raw = anchored ? pattern.slice(0, -1) : pattern;
  const source = escapeRegex(raw).replace(/\*/g, ".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`);
}

export function wildcardRobotsRules(robots: string): RobotsRule[] {
  const lines = robots.replace(/\r/g, "").split("\n");
  const rules: RobotsRule[] = [];
  let applies = false;
  let groupHasDirective = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (groupHasDirective) {
        applies = false;
        groupHasDirective = false;
      }
      if (value === "*") applies = true;
      continue;
    }

    if (field !== "allow" && field !== "disallow") continue;
    groupHasDirective = true;
    if (!applies || value === "") continue;
    rules.push({ directive: field, pattern: value });
  }
  return rules;
}

export function robotsAllows(robots: string, pathAndQuery: string): boolean {
  const matching = wildcardRobotsRules(robots)
    .filter((rule) => ruleRegex(rule.pattern).test(pathAndQuery))
    .sort((a, b) => b.pattern.replace(/[*$]/g, "").length - a.pattern.replace(/[*$]/g, "").length);

  if (matching.length === 0) return true;
  const bestLength = matching[0].pattern.replace(/[*$]/g, "").length;
  const strongest = matching.filter((rule) => rule.pattern.replace(/[*$]/g, "").length === bestLength);
  return strongest.some((rule) => rule.directive === "allow");
}
