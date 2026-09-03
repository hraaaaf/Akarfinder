import { writeFile } from "node:fs/promises";
import { load } from "cheerio";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const targets = [
  ["8192907","https://www.mubawab.ma/fr/a/8192907/superbe-villa-paranfa"],
  ["8370499","https://www.mubawab.ma/fr/a/8370499/villa-contemporaine-d%E2%80%99exception-%C3%A0-ain-diab"],
  ["8303206","https://www.mubawab.ma/fr/a/8303206/belle-villa-meubl%C3%A9-pr%C3%A8s-naershore-sidi-maarouf"],
  ["8407067","https://www.mubawab.ma/fr/a/8407067/maison-%C3%A0-acheter-%C3%A0-dar-touzani-5-pi%C3%A8ces-confortables-belle-terrasse"],
  ["7952262","https://www.mubawab.ma/fr/a/7952262/maison-%C3%A0-2-fa%C3%A7ades-%C3%A0-1-minute-du-busway-sefrou-%C3%A0-hay-moulay-abdellah-ain-chok-casablanca"],
  ["8403866","https://www.mubawab.ma/fr/a/8403866/dar-jwhara-sidi-moumen"],
  ["8398074","https://www.mubawab.ma/fr/a/8398074/maison-%C3%A0-r%C3%A9nover-%C3%A0-ain-diab-extension"],
  ["8400703","https://www.mubawab.ma/fr/a/8400703/immeuble-d%E2%80%99appartements-haut-standing-%E2%80%93-racine"],
  ["8272085","https://www.mubawab.ma/fr/a/8272085/top-villa-ultra-moderne-piscine"],
  ["8395121","https://www.mubawab.ma/fr/a/8395121/usine-d%C3%A9p%C3%B4t-sur-4-%C3%A9tages-2900-m%C2%B2-mauritania"],
  ["8289021","https://www.mubawab.ma/fr/a/8289021/local-commercial-avec-grande-soupente"],
  ["8269234","https://www.mubawab.ma/fr/a/8269234/terrain-constructible-pour-villa"],
  ["6845332","https://www.mubawab.ma/fr/a/6845332/terrain-de-3200-m2-%C3%A0-californie"],
  ["6844970","https://www.mubawab.ma/fr/a/6844970/terrain-de-1520-m2-%C3%A0-anfa-sup%C3%A9rieure"],
  ["6885461","https://www.mubawab.ma/fr/a/6885461/terrain-de-14000-m2-i2s1-%C3%A0-roches-noires"],
  ["6885142","https://www.mubawab.ma/fr/a/6885142/terrain-de-3-5-hectares-i5-%C3%A0-lissasfa"],
  ["6885137","https://www.mubawab.ma/fr/a/6885137/terrain-de-7-hectares-i2-%C3%A0-lissasfa"],
  ["6885170","https://www.mubawab.ma/fr/a/6885170/terrain-de-13000-m2-i2s1-%C3%A0-bd-chefchaouni"],
  ["6882123","https://www.mubawab.ma/fr/a/6882123/terrain-de-1-hectare-i5h-%C3%A0-sidi-maarouf"],
  ["6845341","https://www.mubawab.ma/fr/a/6845341/terrain-de-1100-m2-%C3%A0-californie"],
  ["6885408","https://www.mubawab.ma/fr/a/6885408/terrain-de-4-hectares-i2-%C3%A0-bernoussi"],
  ["8394877","https://www.mubawab.ma/fr/a/8394877/villa-%C3%A0-r%C3%A9nover-sur-un-terrain-de-2-000-m%C2%B2-les-ambassadeurs-rabat"],
  ["8377707","https://www.mubawab.ma/fr/a/8377707/villa-de-prestige-3200m%C2%B2-%C3%A0-rabat"],
  ["8407231","https://www.mubawab.ma/fr/a/8407231/villa-les-orangers"],
  ["8322734","https://www.mubawab.ma/fr/a/8322734/villa-d-exception-%C3%A0-souissi-rabat-1-854-m%C2%B2-de-terrain-%C2%B7-environ-860-m%C2%B2-construits-%C2%B7-3-niveaux"],
  ["8404217","https://www.mubawab.ma/fr/a/8404217/maison-de-famille-pratique-et-lumineuse"],
  ["7752798","https://www.mubawab.ma/fr/a/7752798/maison-proche-de-la-c%C3%B4te-routi%C3%A8re-de-rabat"],
  ["8386732","https://www.mubawab.ma/fr/a/8386732/maison-de-108-m%C2%B2-situ%C3%A9e-%C3%A0-hay-nahda-1-rabat"],
  ["8372571","https://www.mubawab.ma/fr/a/8372571/opportunite-villa-%C3%A0-parachever"],
  ["8384305","https://www.mubawab.ma/fr/a/8384305/loft-moderne-et-lumineux-au-haut-agdal"],
  ["8211668","https://www.mubawab.ma/fr/a/8211668/studio-%C3%A0-rabat-medina"],
  ["8123653","https://www.mubawab.ma/fr/a/8123653/maison-chaleureuse"],
  ["8213592","https://www.mubawab.ma/fr/a/8213592/magasin-180m-place-pi%C3%A8trie-fond-et-mur"],
  ["8332692","https://www.mubawab.ma/fr/a/8332692/local-commercial-de-450m%C2%B2-%C3%A0-agdal-id%C3%A9al-pour-superette"],
  ["8361717","https://www.mubawab.ma/fr/a/8361717/local-commercial-200-m%C2%B2-avenue-de-l-atlas"],
  ["8390623","https://www.mubawab.ma/fr/a/8390623/terrain-de-553m2-%C3%A0-fort-potentiel-aviation"],
  ["8336929","https://www.mubawab.ma/fr/a/8336929/exclusivit%C3%A9-b-b-partners-%E2%80%93-terrain-commercial-premium-%C3%A0-agdal"],
  ["8351754","https://www.mubawab.ma/fr/a/8351754/exclusivit%C3%A9-%E2%80%93-terrain-commercial-9-098-m%C2%B2-avenue-des-princesses-souissi-rabat"],
] as const;

function classify(html: string): { status: "live" | "unavailable"; title: string | null } {
  const $ = load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const unavailable = /cette page n['’]est plus disponible|page n['’]est plus disponible|désolés?\s*!.*plus disponible/i.test(text);
  const title = $("h1").first().text().replace(/\s+/g, " ").trim() || null;
  return { status: unavailable ? "unavailable" : "live", title };
}

const results: Array<Record<string, unknown>> = [];
for (const [source_id, url] of targets) {
  try {
    if (!(await isAllowedByRobots(url))) {
      results.push({ source_id, url, status: "robots_disallowed" });
      continue;
    }
    const fetched = await fetchHtml(url);
    results.push({ source_id, url, ...classify(fetched.html) });
  } catch (error) {
    results.push({ source_id, url, status: "fetch_error", error: error instanceof Error ? error.message : String(error) });
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const counts = results.reduce<Record<string, number>>((acc, row) => {
  const key = String(row.status);
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
const proof = { generated_at: new Date().toISOString(), target_count: targets.length, counts, results };
await writeFile("mubawab-reject-availability-audit.json", JSON.stringify(proof, null, 2), "utf8");
console.log(JSON.stringify(proof, null, 2));
