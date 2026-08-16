export const dynamic = "force-dynamic";

export function GET() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="#e9eef3"/>
      <rect y="300" width="800" height="200" fill="#cbd5df"/>
      <rect x="80" y="120" width="230" height="210" rx="8" fill="#d7b98d"/>
      <rect x="350" y="80" width="310" height="250" rx="8" fill="#c6d1dc"/>
      <rect x="120" y="165" width="48" height="72" fill="#eef4f8"/>
      <rect x="205" y="165" width="48" height="72" fill="#eef4f8"/>
      <rect x="400" y="130" width="70" height="85" fill="#eef4f8"/>
      <rect x="525" y="130" width="70" height="85" fill="#eef4f8"/>
      <path d="M0 410 C180 360 310 455 480 400 C620 355 720 390 800 370" fill="none" stroke="#ffffff" stroke-width="16" opacity="0.9"/>
      <circle cx="710" cy="210" r="55" fill="#8aa78a"/>
      <rect x="700" y="250" width="18" height="90" fill="#7a6751"/>
      <text x="38" y="58" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#07304f">Fixture QA Street Reality</text>
      <text x="38" y="88" font-family="Arial, sans-serif" font-size="18" fill="#526579">Contexte street-level synthétique · aucune annonce réelle</text>
    </svg>`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
