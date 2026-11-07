/** Keep the V5 place slug/name intact; only normalize the user-facing French city label. */
export function publicNationalCityLabel(sourceSlug: string, sourceName: string): string {
  return sourceSlug === "mohammadia" ? "Mohammedia" : sourceName;
}
