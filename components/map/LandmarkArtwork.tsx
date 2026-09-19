"use client";

type LandmarkArtworkProps = {
  artworkKey: string;
  className?: string;
  decorative?: boolean;
};

const NAVY = "#071B33";
const BLUE = "#0B63CE";
const SKY = "#DCEBFF";
const GREEN = "#3C9A63";
const SAND = "#E9D7B8";
const GOLD = "#C59A45";
const RED = "#D85A4F";

function Frame({ children, label, decorative, className = "" }: { children: React.ReactNode; label: string; decorative: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 190"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
    >
      <rect width="320" height="190" rx="26" fill="#FFFFFF" />
      <circle cx="236" cy="44" r="58" fill={SKY} opacity=".72" />
      <ellipse cx="160" cy="159" rx="122" ry="17" fill="#F4F8FC" />
      {children}
    </svg>
  );
}

function TwinCenter() {
  return (
    <>
      <g stroke={NAVY} strokeLinecap="round" strokeLinejoin="round">
        <path d="M105 151V55L145 45V151M175 151V45L215 55V151" fill="#EAF3FF" strokeWidth="2" />
        <path d="M115 64V142M126 60V142M137 57V142M186 57V142M197 60V142M208 64V142" strokeOpacity=".38" />
        <path d="M98 151H222" strokeWidth="2.2" />
      </g>
      <g stroke={GREEN} strokeWidth="2" strokeLinecap="round">
        <path d="M78 151V121M242 151V121" />
        <path d="M67 125C74 111 82 111 89 125M231 125C238 111 246 111 253 125" />
      </g>
      <rect x="127" y="132" width="66" height="19" rx="5" fill={NAVY} />
      <text x="160" y="145" textAnchor="middle" fill="white" fontSize="9" fontWeight="800">TWIN CENTER</text>
    </>
  );
}

function StadeMohammedV() {
  return (
    <>
      <ellipse cx="160" cy="116" rx="92" ry="44" fill="#EAF3FF" stroke={NAVY} strokeWidth="2.2" />
      <ellipse cx="160" cy="116" rx="70" ry="31" fill="#FFFFFF" stroke={BLUE} strokeWidth="2" />
      <ellipse cx="160" cy="116" rx="50" ry="20" fill="#DFF1E5" stroke={GREEN} strokeWidth="1.8" />
      <path d="M110 95C125 83 195 83 210 95M108 137C125 149 195 149 212 137" stroke={NAVY} strokeOpacity=".35" strokeWidth="4" />
      <path d="M82 142H238" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
      <rect x="131" y="100" width="58" height="32" rx="4" fill="#78B987" opacity=".55" />
      <path d="M160 100V132M131 116H189" stroke="white" strokeWidth="1.4" opacity=".9" />
    </>
  );
}

function MoroccoMall() {
  return (
    <>
      <path d="M72 151V96C72 82 83 72 97 72H223C237 72 248 82 248 96V151" fill="#F7F1E7" stroke={NAVY} strokeWidth="2" />
      <path d="M89 90H231M89 110H231" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <path d="M119 151V116H201V151" fill="#EAF3FF" stroke={NAVY} strokeWidth="1.6" />
      <path d="M143 116C143 103 151 96 160 96C169 96 177 103 177 116" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.4" />
      <g stroke={GREEN} strokeWidth="2" strokeLinecap="round">
        <path d="M61 151V116M259 151V116" />
        <path d="M49 120C56 105 66 105 73 120M247 120C254 105 264 105 271 120" />
      </g>
      <rect x="131" y="77" width="58" height="18" rx="5" fill={BLUE} />
      <text x="160" y="89" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="800">MOROCCO MALL</text>
    </>
  );
}

function CfcTower() {
  return (
    <>
      <path d="M126 151L138 48L194 34L205 151Z" fill="#DDEEFF" stroke={NAVY} strokeWidth="2.2" />
      <path d="M148 47L160 151M165 43L178 151M182 39L194 151" stroke={BLUE} strokeOpacity=".45" strokeWidth="2" />
      <path d="M115 151H218" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
      <g stroke={GREEN} strokeWidth="2">
        <path d="M99 151V126M226 151V126" />
        <path d="M90 130C96 117 103 117 109 130M217 130C223 117 230 117 236 130" />
      </g>
    </>
  );
}

function AnfaPark() {
  return (
    <>
      <path d="M70 151C112 124 124 91 160 82C199 72 215 110 250 122V151Z" fill="#E8F6EC" />
      <path d="M88 151C117 124 144 109 169 105C194 101 218 115 240 137" fill="none" stroke="#D2B48C" strokeWidth="12" strokeLinecap="round" />
      {[96,128,172,205,232].map((x, i) => (
        <g key={x} transform={"translate(" + x + " " + (111 + (i % 2) * 8) + ")"}>
          <rect x="-2" y="14" width="4" height="28" rx="2" fill="#8B6B4B" />
          <circle cy="4" r="15" fill={i % 2 ? "#4E9C68" : GREEN} />
          <circle cx="-9" cy="9" r="9" fill="#62AD79" />
          <circle cx="9" cy="10" r="9" fill="#62AD79" />
        </g>
      ))}
      <path d="M66 151H254" stroke={NAVY} strokeOpacity=".22" strokeWidth="2" />
    </>
  );
}

function LyceeLyautey() {
  return (
    <>
      <path d="M74 151V88H246V151" fill="#FFF9F0" stroke={NAVY} strokeWidth="2" />
      <path d="M90 88V72H230V88M110 72V60H210V72" fill="#F4E4C8" stroke={NAVY} strokeWidth="1.7" />
      {[96,128,192,224].map((x) => <rect key={x} x={x} y="104" width="18" height="25" rx="4" fill="#DCEBFF" stroke={BLUE} strokeWidth="1.2" />)}
      <path d="M145 151V118C145 107 151 100 160 100C169 100 175 107 175 118V151" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.6" />
      <path d="M65 151H255" stroke={NAVY} strokeWidth="2" />
      <g stroke={GREEN} strokeWidth="2"><path d="M61 151V124M259 151V124" /><path d="M52 128C58 114 65 114 71 128M250 128C256 114 263 114 269 128" /></g>
    </>
  );
}

function Instituto() {
  return (
    <>
      <path d="M78 151V93H242V151" fill="#FFF9F0" stroke={NAVY} strokeWidth="2" />
      <path d="M96 93V75H224V93" fill="#F4E4C8" stroke={NAVY} strokeWidth="1.5" />
      <rect x="99" y="108" width="28" height="22" rx="3" fill="#DCEBFF" stroke={BLUE} strokeWidth="1.2" />
      <rect x="193" y="108" width="28" height="22" rx="3" fill="#DCEBFF" stroke={BLUE} strokeWidth="1.2" />
      <path d="M146 151V118H174V151" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.5" />
      <path d="M112 75V49" stroke={NAVY} strokeWidth="2" />
      <path d="M113 51H145V65H113Z" fill="#F5C542" stroke={RED} strokeWidth="1.2" />
      <path d="M113 51H145M113 65H145" stroke={RED} strokeWidth="3" />
      <path d="M68 151H252" stroke={NAVY} strokeWidth="2" />
    </>
  );
}

function BouskouraForest() {
  return (
    <>
      <path d="M74 151C96 132 119 118 160 112C204 106 229 126 250 151Z" fill="#E8F6EC" />
      {[88,112,139,168,198,226].map((x, i) => (
        <g key={x} transform={"translate(" + x + " " + (83 + (i % 2) * 10) + ")"}>
          <rect x="-3" y="33" width="6" height="44" rx="2" fill="#7A5B3B" />
          <path d="M0 0L-19 36H19Z" fill={i % 2 ? "#2F7C4D" : GREEN} />
          <path d="M0 14L-16 46H16Z" fill={i % 2 ? "#3D8D5A" : "#52A56B"} />
        </g>
      ))}
      <path d="M145 151C148 136 156 124 171 116C186 127 196 138 199 151" fill="none" stroke="#D2B48C" strokeWidth="9" strokeLinecap="round" />
    </>
  );
}

function Generic({ keyName }: { keyName: string }) {
  const isGreen = keyName === "park";
  const accent = isGreen ? GREEN : BLUE;
  return (
    <>
      <circle cx="160" cy="104" r="46" fill={isGreen ? "#E8F6EC" : "#EAF3FF"} />
      <path d="M124 151V113L160 86L196 113V151" fill="#FFFFFF" stroke={NAVY} strokeWidth="2" />
      <path d="M116 113L160 80L204 113" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="146" y="123" width="28" height="28" rx="5" fill={accent} opacity=".9" />
      <path d="M103 151H217" stroke={NAVY} strokeOpacity=".2" strokeWidth="2" />
    </>
  );
}

export function LandmarkArtwork({ artworkKey, className = "", decorative = false }: LandmarkArtworkProps) {
  let scene: React.ReactNode;
  switch (artworkKey) {
    case "twin-center": scene = <TwinCenter />; break;
    case "stade-mohammed-v": scene = <StadeMohammedV />; break;
    case "morocco-mall": scene = <MoroccoMall />; break;
    case "cfc-first-tower": scene = <CfcTower />; break;
    case "anfa-park": scene = <AnfaPark />; break;
    case "lycee-lyautey": scene = <LyceeLyautey />; break;
    case "institut-juan-ramon-jimenez": scene = <Instituto />; break;
    case "foret-de-bouskoura": scene = <BouskouraForest />; break;
    default: scene = <Generic keyName={artworkKey} />; break;
  }

  return (
    <Frame className={className} decorative={decorative} label="Illustration de repère AkarFinder">
      {scene}
    </Frame>
  );
}
