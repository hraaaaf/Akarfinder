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
const GREEN_DARK = "#216D44";
const SAND = "#E9D7B8";
const CREAM = "#FFF8EC";
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
      <rect width="320" height="190" rx="28" fill="#F8FBFF" />
      <rect x="5" y="5" width="310" height="180" rx="24" fill="#FFFFFF" stroke="#CFE0F4" strokeWidth="2" />
      <path d="M24 30H92" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
      <circle cx="286" cy="30" r="7" fill={BLUE} opacity=".92" />
      <path d="M28 157H292" stroke="#D8E5F1" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="160" cy="157" rx="118" ry="13" fill="#EAF1F7" opacity=".88" />
      {children}
    </svg>
  );
}

function Palm({ x, y = 105, scale = 1 }: { x: number; y?: number; scale?: number }) {
  return (
    <g transform={"translate(" + x + " " + y + ") scale(" + scale + ")"}>
      <path d="M0 15V49" stroke="#8A6741" strokeWidth="4" strokeLinecap="round" />
      <path d="M0 14C-18 1-28 5-31 13C-17 12-8 17 0 21M0 14C18 1 28 5 31 13C17 12 8 17 0 21M0 14C-7-5-1-15 6-18C10-5 8 5 0 21M0 14C7-5 1-15-6-18C-10-5-8 5 0 21" fill={GREEN} stroke={GREEN_DARK} strokeWidth="1.4" strokeLinejoin="round" />
    </g>
  );
}

function TwinCenter() {
  return (
    <>
      <g stroke={NAVY} strokeLinecap="round" strokeLinejoin="round">
        <path d="M102 151V63L145 47L145 151Z" fill="#EAF3FF" strokeWidth="2.5" />
        <path d="M175 151V47L218 63V151Z" fill="#EAF3FF" strokeWidth="2.5" />
        <path d="M112 68L137 59M112 82L137 73M112 96L137 87M112 110L137 101M112 124L137 115" stroke={BLUE} strokeOpacity=".46" strokeWidth="2" />
        <path d="M183 59L208 68M183 73L208 82M183 87L208 96M183 101L208 110M183 115L208 124" stroke={BLUE} strokeOpacity=".46" strokeWidth="2" />
        <path d="M96 151H224" strokeWidth="2.5" />
      </g>
      <rect x="143" y="67" width="34" height="84" fill="#F2F7FC" stroke={NAVY} strokeWidth="1.5" />
      <path d="M151 77V139M160 73V139M169 77V139" stroke={BLUE} strokeOpacity=".32" />
      <Palm x={77} y={111} scale={0.7} />
      <Palm x={243} y={111} scale={0.7} />
      <rect x="123" y="135" width="74" height="18" rx="5" fill={NAVY} />
      <text x="160" y="147.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" letterSpacing=".7">TWIN CENTER</text>
    </>
  );
}

function StadeMohammedV() {
  return (
    <>
      <g fill="none" stroke={NAVY} strokeLinecap="round" strokeLinejoin="round">
        <path d="M72 119C72 86 112 66 160 66C208 66 248 86 248 119V137C248 153 209 162 160 162C111 162 72 153 72 137Z" fill="#F4F8FC" strokeWidth="2.4" />
        <ellipse cx="160" cy="117" rx="70" ry="31" fill="#FFFFFF" stroke={BLUE} strokeWidth="2.4" />
        <ellipse cx="160" cy="117" rx="50" ry="20" fill="#DFF1E5" stroke={GREEN_DARK} strokeWidth="1.8" />
        <path d="M86 101C110 89 133 84 160 84C187 84 210 89 234 101M84 136C110 148 135 153 160 153C185 153 210 148 236 136" strokeOpacity=".35" strokeWidth="4" />
      </g>
      <path d="M160 97V137M110 117H210" stroke="#FFFFFF" strokeWidth="1.7" />
      <g stroke={NAVY} strokeWidth="2.2" strokeLinecap="round">
        <path d="M79 96V51M241 96V51" />
        <path d="M68 51H90M230 51H252" />
      </g>
      <g fill={BLUE}>
        <circle cx="72" cy="51" r="3" /><circle cx="79" cy="51" r="3" /><circle cx="86" cy="51" r="3" />
        <circle cx="234" cy="51" r="3" /><circle cx="241" cy="51" r="3" /><circle cx="248" cy="51" r="3" />
      </g>
    </>
  );
}

function MoroccoMall() {
  return (
    <>
      <Palm x={68} y={105} scale={0.72} />
      <Palm x={252} y={105} scale={0.72} />
      <path d="M82 151V91C82 78 93 69 107 69H213C227 69 238 78 238 91V151Z" fill={CREAM} stroke={NAVY} strokeWidth="2.3" />
      <path d="M98 91H222" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <path d="M107 151V114H213V151" fill="#EEF6FF" stroke={NAVY} strokeWidth="1.8" />
      <path d="M137 151V122C137 105 147 95 160 95C173 95 183 105 183 122V151" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.8" />
      <path d="M122 114V151M198 114V151" stroke={BLUE} strokeOpacity=".42" />
      <rect x="118" y="72" width="84" height="18" rx="5" fill="#FFFFFF" stroke={BLUE} strokeWidth="1.4" />
      <text x="160" y="84.5" textAnchor="middle" fill={NAVY} fontSize="8.8" fontWeight="900" letterSpacing=".5">MOROCCO MALL</text>
    </>
  );
}

function CfcTower() {
  return (
    <>
      <path d="M119 151L137 53L188 35L208 151Z" fill="#EAF3FF" stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M137 53L160 151L188 35" fill="#D7EBFF" stroke={BLUE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M151 48L168 151M169 42L186 151" stroke="#FFFFFF" strokeWidth="2.1" opacity=".95" />
      <path d="M113 151H215" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      <g fill={GREEN}>
        <circle cx="101" cy="141" r="10" /><circle cx="220" cy="141" r="10" /><circle cx="232" cy="144" r="7" />
      </g>
      <path d="M92 151H238" stroke={GREEN_DARK} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function AnfaPark() {
  return (
    <>
      <path d="M61 151C83 124 105 98 137 90C169 82 195 91 217 108C232 119 245 134 259 151Z" fill="#E8F6EC" />
      <path d="M97 151C112 132 128 118 149 109C170 100 194 102 221 119" fill="none" stroke="#80C6E9" strokeWidth="11" strokeLinecap="round" />
      <path d="M91 151C108 128 126 112 148 103C169 94 195 96 226 117" fill="none" stroke="#F3DFC0" strokeWidth="6" strokeLinecap="round" />
      <Palm x={80} y={101} scale={0.62} />
      <Palm x={232} y={102} scale={0.64} />
      {[118,153,188].map((x, i) => (
        <g key={x}>
          <rect x={x - 2} y={112 + (i % 2) * 5} width="4" height="33" rx="2" fill="#83613F" />
          <circle cx={x} cy={104 + (i % 2) * 5} r="13" fill={i === 1 ? GREEN_DARK : GREEN} />
          <circle cx={x - 9} cy={110 + (i % 2) * 5} r="8" fill="#63AA79" />
          <circle cx={x + 9} cy={110 + (i % 2) * 5} r="8" fill="#63AA79" />
        </g>
      ))}
    </>
  );
}

function LyceeLyautey() {
  return (
    <>
      <path d="M65 151V97H255V151Z" fill={CREAM} stroke={NAVY} strokeWidth="2.3" />
      <path d="M91 97V79H229V97M121 79V65H199V79" fill="#F1DFC4" stroke={NAVY} strokeWidth="1.7" />
      <path d="M146 151V112H174V151" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.7" />
      {[83,109,193,219].map((x) => <rect key={x} x={x} y="112" width="17" height="22" rx="3" fill="#DCEBFF" stroke={BLUE} strokeWidth="1.2" />)}
      <path d="M160 65V44" stroke={NAVY} strokeWidth="2" />
      <path d="M160 44L184 49L160 57Z" fill={RED} stroke={RED} strokeLinejoin="round" />
      <path d="M54 151H266" stroke={NAVY} strokeWidth="2.2" />
      <Palm x={52} y={115} scale={0.56} />
      <Palm x={268} y={115} scale={0.56} />
      <rect x="139" y="82" width="42" height="11" rx="4" fill={NAVY} opacity=".94" />
      <text x="160" y="90" textAnchor="middle" fill="#FFFFFF" fontSize="6.8" fontWeight="900">LYAUTÉE</text>
    </>
  );
}

function Instituto() {
  return (
    <>
      <path d="M70 151V101H250V151Z" fill="#FFF9EF" stroke={NAVY} strokeWidth="2.3" />
      <path d="M102 101V84H218V101" fill="#F0DDC0" stroke={NAVY} strokeWidth="1.6" />
      <path d="M137 101V66H183V101" fill="#F6E7D0" stroke={NAVY} strokeWidth="1.8" />
      <path d="M145 66V55H175V66" fill={CREAM} stroke={NAVY} strokeWidth="1.6" />
      <circle cx="160" cy="76" r="7" fill="#FFFFFF" stroke={BLUE} strokeWidth="1.5" />
      <path d="M160 72V76L164 79" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round" />
      {[88,111,196,219].map((x) => <path key={x} d={"M" + x + " 151V119C" + x + " 111 " + (x+6) + " 107 " + (x+12) + " 107C" + (x+18) + " 107 " + (x+24) + " 111 " + (x+24) + " 119V151"} fill="#FFFFFF" stroke={NAVY} strokeWidth="1.35" />)}
      <path d="M149 151V119H171V151" fill="#EAF3FF" stroke={NAVY} strokeWidth="1.5" />
      <path d="M110 84V56" stroke={NAVY} strokeWidth="2" />
      <path d="M111 57H139V69H111Z" fill="#F6C743" stroke={RED} strokeWidth="1.2" />
      <path d="M111 57H139M111 69H139" stroke={RED} strokeWidth="3" />
      <path d="M58 151H262" stroke={NAVY} strokeWidth="2.2" />
    </>
  );
}

function BouskouraForest() {
  return (
    <>
      <path d="M55 151C78 127 105 112 137 106C171 100 209 110 265 151Z" fill="#E8F6EC" />
      {[74,101,130,160,192,221,248].map((x, i) => (
        <g key={x} transform={"translate(" + x + " " + (73 + (i % 3) * 8) + ")"}>
          <rect x="-3" y="41" width="6" height="39" rx="2" fill="#79593A" />
          <path d="M0 0L-21 39H21Z" fill={i % 2 ? GREEN_DARK : GREEN} />
          <path d="M0 17L-18 50H18Z" fill={i % 2 ? "#398357" : "#56A76D"} />
        </g>
      ))}
      <path d="M137 151C142 133 151 120 164 112C178 121 188 134 194 151" fill="none" stroke="#D8BC8B" strokeWidth="11" strokeLinecap="round" />
      <path d="M137 151C142 133 151 120 164 112C178 121 188 134 194 151" fill="none" stroke="#F5E7CB" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}


function MarcheDarEssalam() {
  return (
    <>
      <path d="M55 151V105L91 83H229L265 105V151Z" fill={CREAM} stroke={NAVY} strokeWidth="2.2" />
      <path d="M70 105C101 78 219 78 250 105" fill="none" stroke={GREEN} strokeWidth="7" strokeLinecap="round" />
      {[93,126,160,194,227].map((x) => <path key={x} d={"M"+x+" 151V104"} stroke="#FFFFFF" strokeWidth="12" opacity=".92" />)}
      {[93,126,160,194,227].map((x) => <path key={"b"+x} d={"M"+x+" 151V104"} stroke={BLUE} strokeWidth="1.2" opacity=".75" />)}
      <path d="M130 151V123H190V151" fill="#EAF3FF" stroke={NAVY} strokeWidth="1.7" />
      <circle cx="160" cy="101" r="12" fill="#FFFFFF" stroke={GREEN_DARK} strokeWidth="2" />
      <path d="M153 101C157 95 163 95 167 101C163 107 157 107 153 101Z" fill={GREEN} />
      <Palm x={49} y={113} scale={0.48} /><Palm x={271} y={113} scale={0.48} />
    </>
  );
}

function ParcSindibad() {
  return (
    <>
      <path d="M54 151C80 128 108 116 140 113C177 109 218 120 266 151Z" fill="#E8F6EC" />
      <path d="M82 151V93C82 77 95 64 111 64C127 64 140 77 140 93C140 109 127 122 111 122C95 122 82 109 82 93" fill="none" stroke={RED} strokeWidth="5" />
      <path d="M83 93L139 93M111 65V121" stroke="#F6C743" strokeWidth="2.4" />
      <path d="M166 151V84M166 84L207 151M166 84L126 151" fill="none" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      <path d="M143 102H190L182 113H151Z" fill="#80C6E9" stroke={NAVY} strokeWidth="1.7" />
      <path d="M214 151V108C214 99 221 92 230 92C239 92 246 99 246 108V151" fill={CREAM} stroke={NAVY} strokeWidth="2" />
      <path d="M207 108H253" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
      <Palm x={58} y={111} scale={0.5} />
      <path d="M48 151H270" stroke={GREEN_DARK} strokeWidth="2" />
    </>
  );
}

function ParcVillesJumelees() {
  return (
    <>
      <path d="M58 151C83 126 111 112 143 108C180 103 217 116 262 151Z" fill="#E8F6EC" />
      <path d="M77 151C99 132 123 122 151 119C183 116 211 125 243 145" fill="none" stroke="#F3DFC0" strokeWidth="9" strokeLinecap="round" />
      <Palm x={82} y={101} scale={0.62} />
      <Palm x={238} y={101} scale={0.62} />
      <g fill={GREEN}>
        <circle cx="122" cy="116" r="17" /><circle cx="155" cy="108" r="20" /><circle cx="192" cy="116" r="17" />
      </g>
      <g stroke={NAVY} strokeWidth="2" strokeLinecap="round">
        <path d="M107 151V129M205 151V129" />
        <path d="M98 129H116M196 129H214" />
      </g>
      <path d="M132 151V135H188V151" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.8" />
      <path d="M144 135V124H176V135" fill={CREAM} stroke={NAVY} strokeWidth="1.6" />
    </>
  );
}

function Generic({ keyName }: { keyName: string }) {
  const isGreen = keyName === "park";
  const accent = isGreen ? GREEN : BLUE;
  return (
    <>
      <path d="M109 151V103L160 70L211 103V151Z" fill={isGreen ? "#EFF8F2" : "#EEF6FF"} stroke={NAVY} strokeWidth="2.2" />
      <path d="M101 104L160 64L219 104" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="160" cy="116" r="16" fill="#FFFFFF" stroke={accent} strokeWidth="2" />
      <path d="M160 108V124M152 116H168" stroke={accent} strokeWidth="2" strokeLinecap="round" />
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
    case "parc-des-villes-jumelees": scene = <ParcVillesJumelees />; break;
    case "parc-sindibad": scene = <ParcSindibad />; break;
    case "marche-dar-essalam": scene = <MarcheDarEssalam />; break;
    default: scene = <Generic keyName={artworkKey} />; break;
  }

  return (
    <Frame className={className} decorative={decorative} label="Illustration signalétique de repère AkarFinder">
      {scene}
    </Frame>
  );
}
