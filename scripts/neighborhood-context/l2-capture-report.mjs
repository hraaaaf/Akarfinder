import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = path.resolve(process.env.NCI_L2_OUTPUT_DIR ?? "artifacts/neighborhood-context-l2");
const reportPath = path.join(outputDir, "report.json");
const pngPath = path.join(outputDir, "l2-anchor-selection-proof.png");
if (!fs.existsSync(reportPath)) throw new Error(`Missing L2 report: ${reportPath}`);

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const statusLabel = (status) => status === "ready" ? "Cible 5–8 atteinte" : status === "partial_context" ? "Contexte partiel" : "Contexte insuffisant";
const categoryLabel = {
  transport: "Transport", education: "Éducation", groceries: "Courses", health: "Santé",
  green_sport: "Parcs & sport", shopping: "Shopping", coast: "Côte", banking: "Banques",
  parking: "Parking", food: "Restauration", worship: "Culte", other: "Autres",
};

const cards = report.pilots.map((pilot) => {
  const anchors = pilot.anchors.length ? pilot.anchors.map((anchor) => `
    <li><div class="row"><b>${esc(anchor.name)}</b><span>${esc(categoryLabel[anchor.category] ?? anchor.category)}</span></div>
    <small>${anchor.distance_to_reference_m ?? "?"} m · ${esc(anchor.territorial_wording)} · ${esc(anchor.role)}</small></li>`).join("") :
    `<li class="empty">Aucun anchor publié. Le système reste fail-closed.</li>`;
  return `<article class="card ${pilot.status}"><header><div><em>${esc(pilot.city)}</em><h2>${esc(pilot.neighborhood)}</h2></div><strong>${statusLabel(pilot.status)}</strong></header>
    <div class="metrics"><span>${pilot.candidate_count} candidats</span><span>${pilot.eligible_count} éligibles</span><span>${pilot.anchors.length} anchors</span></div><ol>${anchors}</ol></article>`;
}).join("");

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#10233f;font:14px Inter,Arial,sans-serif}.wrap{width:1400px;margin:auto;padding:34px}.kicker{font-size:12px;font-weight:800;letter-spacing:.12em;color:#0b63ce;text-transform:uppercase}.title{display:flex;justify-content:space-between;align-items:end;margin:8px 0 20px}.title h1{font-size:34px;margin:0}.title p{width:610px;margin:0;color:#66778d;line-height:1.5}.summary{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px}.summary div,.card,.truth{background:white;border:1px solid #dbe5f1;border-radius:16px;box-shadow:0 8px 24px rgba(16,35,63,.05)}.summary div{padding:14px}.summary b{display:block;font-size:24px}.summary span{font-size:11px;color:#718096}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{padding:16px;min-height:330px}.card header{display:flex;justify-content:space-between;gap:10px}.card em{font-style:normal;font-size:10px;font-weight:800;color:#0b63ce;text-transform:uppercase;letter-spacing:.1em}.card h2{margin:3px 0 0;font-size:20px}.card header strong{height:max-content;font-size:10px;padding:6px 9px;border-radius:999px;background:#eaf7ef;color:#237145}.card.partial_context header strong{background:#fff4df;color:#8b5b00}.card.insufficient_context header strong{background:#f0f2f5;color:#657080}.metrics{display:flex;gap:12px;margin:13px 0;color:#738196;font-size:10px}ol{list-style:none;padding:0;margin:0;display:grid;gap:7px}li{padding:8px 9px;border-radius:10px;border:1px solid #edf1f6;background:#fbfcfe}.row{display:flex;justify-content:space-between;gap:8px}.row b{font-size:11px}.row span{font-size:9px;color:#0b63ce}small{display:block;margin-top:4px;color:#7a8798;font-size:9px}.empty{color:#7a8798;font-size:11px}.truth{margin-top:14px;padding:14px;color:${report.truth_findings.length ? "#9b3f35" : "#236f46"};font-size:11px}.foot{display:flex;justify-content:space-between;margin-top:12px;color:#748197;font-size:10px}.pass{font-weight:800;color:${report.ok ? "#236f46" : "#9b3f35"}}
</style></head><body><main class="wrap"><div class="kicker">AkarFinder · Neighborhood Context Intelligence · Lot 2</div><div class="title"><h1>Assignment + Anchor Selection</h1><p>La proximité ne devient jamais une frontière. Les anchors sont limités, diversifiés et conservateurs sur le wording territorial.</p></div><section class="summary"><div><b>${report.summary.pilot_count}</b><span>quartiers pilotes</span></div><div><b>${report.summary.ready_pilots}</b><span>cible 5–8 atteinte</span></div><div><b>${report.summary.partial_pilots}</b><span>contextes partiels</span></div><div><b>${report.summary.total_anchors}</b><span>anchors</span></div><div><b>${report.summary.near_relations}</b><span>relations « autour »</span></div></section><section class="grid">${cards}</section><div class="truth"><b>${report.truth_findings.length} finding vérité</b>${report.truth_findings.length ? `<br>${report.truth_findings.map(esc).join("<br>")}` : " · aucun faux ‘dans le quartier’"}</div><div class="foot"><span>Shadow Casablanca non certifiant · max 2 anchors/catégorie</span><span>${esc(report.generated_at)}</span><span class="pass">${report.ok ? "TECH GATE PASS" : "TECH GATE NOT MET"}</span></div></main></body></html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: pngPath, fullPage: true });
  console.log(`Saved ${pngPath}`);
} finally {
  await browser.close();
}
