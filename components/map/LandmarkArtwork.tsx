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
      <path d="M66 151V119C66 88 106 68 160 68C214 68 254 88 254 119V151Z" fill="#F6F9FC" stroke={NAVY} strokeWidth="2.5" />
      <path d="M77 120C77 95 111 80 160 80C209 80 243 95 243 120" fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
      <path d="M87 122C87 103 116 92 160 92C204 92 233 103 233 122V144H87Z" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.8" />
      <ellipse cx="160" cy="124" rx="49" ry="18" fill="#DFF1E5" stroke={GREEN_DARK} strokeWidth="1.7" />
      <path d="M111 124H209M160 106V142" stroke="#FFFFFF" strokeWidth="1.6" />
      <path d="M97 108C112 100 131 96 160 96C189 96 208 100 223 108" fill="none" stroke="#9FC8F8" strokeWidth="5" strokeLinecap="round" />
      <path d="M118 139H202" stroke={BLUE} strokeWidth="3.2" strokeLinecap="round" />
      <rect x="117" y="136" width="86" height="15" rx="5" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.4" />
      <text x="160" y="146.5" textAnchor="middle" fill={NAVY} fontSize="7.2" fontWeight="900" letterSpacing=".35">STADE MOHAMMED V</text>
      <g stroke={NAVY} strokeWidth="2.4" strokeLinecap="round">
        <path d="M81 102V49M239 102V49" />
        <path d="M69 49H93M227 49H251" />
      </g>
      <g fill={BLUE}>
        {[73,81,89,231,239,247].map((x) => <circle key={x} cx={x} cy="49" r="3" />)}
      </g>
    </>
  );
}

function MoroccoMall() {
  return (
    <>
      <Palm x={62} y={108} scale={0.68} />
      <Palm x={258} y={108} scale={0.68} />
      <path d="M72 151V106L103 79H217L248 106V151Z" fill={CREAM} stroke={NAVY} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M98 151V99L122 78H198L222 99V151Z" fill="#E7F3FF" stroke={BLUE} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M126 151V105H194V151" fill="#CFE7FF" stroke={NAVY} strokeWidth="1.5" />
      <path d="M160 105V151M137 105V151M183 105V151" stroke="#FFFFFF" strokeWidth="2.1" opacity=".95" />
      <path d="M105 79H215" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <rect x="111" y="83" width="98" height="21" rx="5" fill="#FFFFFF" stroke={BLUE} strokeWidth="1.4" />
      <text x="160" y="96.5" textAnchor="middle" fill={NAVY} fontSize="8.6" fontWeight="900" letterSpacing=".4">MOROCCO MALL</text>
      <path d="M82 151H238" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
      <circle cx="97" cy="139" r="6" fill={GREEN} /><circle cx="223" cy="139" r="6" fill={GREEN} />
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
      <path d="M58 151V103H262V151Z" fill={CREAM} stroke={NAVY} strokeWidth="2.3" />
      <path d="M85 103V82H235V103M116 82V66H204V82" fill="#EFD8B8" stroke={NAVY} strokeWidth="1.8" />
      <path d="M141 151V111H179V151" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.8" />
      <path d="M151 111V151M169 111V151" stroke={BLUE} strokeOpacity=".35" />
      {[76,101,219,244].map((x) => <rect key={x} x={x} y="116" width="16" height="21" rx="2.5" fill="#DCEBFF" stroke={BLUE} strokeWidth="1.2" />)}
      <path d="M126 82H194" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <rect x="133" y="84" width="54" height="13" rx="4" fill={NAVY} />
      <text x="160" y="93.5" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900">LYCÉE LYAUTEY</text>
      <path d="M160 66V43" stroke={NAVY} strokeWidth="2" />
      <path d="M160 43L183 48L160 56Z" fill={RED} stroke={RED} />
      <Palm x={48} y={114} scale={0.53} /><Palm x={272} y={114} scale={0.53} />
      <path d="M46 151H274" stroke={NAVY} strokeWidth="2.2" />
    </>
  );
}

function Instituto() {
  return (
    <>
      <path d="M72 151V108H248V151Z" fill="#FFF9EF" stroke={NAVY} strokeWidth="2.3" />
      <path d="M96 108V91H224V108" fill="#F0DDC0" stroke={NAVY} strokeWidth="1.7" />
      <path d="M129 108V69H191V108" fill="#F8E7CD" stroke={NAVY} strokeWidth="1.9" />
      <path d="M140 69V55H180V69" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.5" />
      <circle cx="160" cy="82" r="8" fill="#FFFFFF" stroke={BLUE} strokeWidth="1.5" />
      <path d="M160 77V82L165 85" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M86 151V122C86 113 93 108 101 108C109 108 116 113 116 122V151M204 151V122C204 113 211 108 219 108C227 108 234 113 234 122V151" fill="#FFFFFF" stroke={NAVY} strokeWidth="1.4" />
      <path d="M147 151V118H173V151" fill="#EAF3FF" stroke={NAVY} strokeWidth="1.5" />
      <path d="M117 91V55" stroke={NAVY} strokeWidth="2" />
      <path d="M118 57H147V69H118Z" fill="#F6C743" stroke={RED} strokeWidth="1" />
      <path d="M118 60H147M118 66H147" stroke={RED} strokeWidth="2.2" />
      <Palm x={56} y={115} scale={0.52} /><Palm x={264} y={115} scale={0.52} />
      <path d="M53 151H267" stroke={NAVY} strokeWidth="2.2" />
    </>
  );
}

function BouskouraForest() {
  return (
    <>
      <path d="M49 151C76 126 106 111 139 106C176 100 216 113 271 151Z" fill="#E8F6EC" />
      {[67,94,124,157,190,220,250].map((x, i) => (
        <g key={x} transform={"translate(" + x + " " + (70 + (i % 3) * 7) + ")"}>
          <rect x="-3" y="43" width="6" height="39" rx="2" fill="#79593A" />
          <path d="M0 0L-22 40H22Z" fill={i % 2 ? GREEN_DARK : GREEN} />
          <path d="M0 18L-19 53H19Z" fill={i % 2 ? "#398357" : "#56A76D"} />
        </g>
      ))}
      <path d="M133 151C139 133 149 121 163 113C177 122 188 135 194 151" fill="none" stroke="#D8BC8B" strokeWidth="10" strokeLinecap="round" />
      <path d="M133 151C139 133 149 121 163 113C177 122 188 135 194 151" fill="none" stroke="#F5E7CB" strokeWidth="4" strokeLinecap="round" />
      <rect x="119" y="126" width="82" height="24" rx="5" fill="#E7D7B9" stroke={NAVY} strokeWidth="1.5" />
      <text x="160" y="136.5" textAnchor="middle" fill={NAVY} fontSize="7.4" fontWeight="900">FORÊT</text>
      <text x="160" y="145.5" textAnchor="middle" fill={NAVY} fontSize="6.8" fontWeight="800">DE BOUSKOURA</text>
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
    default: scene = <Generic keyName={artworkKey} />; break;
  }

  return (
    <Frame className={className} decorative={decorative} label="Illustration signalétique de repère AkarFinder">
      {scene}
    </Frame>
  );
}
