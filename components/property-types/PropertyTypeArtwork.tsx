import { getOptionAPropertyType } from "@/lib/property-types/presentation";

type PropertyTypeArtworkProps = {
  kind: string;
  className?: string;
  decorative?: boolean;
};

const NAVY = "#071B3C";
const BLUE = "#0B63CE";
const BLUE_2 = "#1F78E5";
const PALE = "#DCEBFF";
const PALE_2 = "#EEF6FF";
const GOLD = "#C59A45";
const GOLD_2 = "#E3C37B";
const WHITE = "#FFFFFF";

function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 28C-3 13-11 6-23 1-20 15-13 23 0 28Z" fill={NAVY} opacity=".9" />
      <path d="M0 28C4 11 13 2 28-4 24 14 15 24 0 28Z" fill={BLUE} opacity=".78" />
      <path d="M0 28C-1 10 3-1 12-12 15 5 10 19 0 28Z" fill={GOLD} opacity=".72" />
      <rect x="-8" y="27" width="16" height="13" rx="4" fill={NAVY} />
    </g>
  );
}

function Palm({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 55C2 31 3 10 0-8" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <path d="M0-6C-18-20-36-17-50-6-28-5-13 1 0 12M0-6C18-21 37-18 52-4 29-5 14 2 0 12M0-6C-7-27-1-43 10-55 12-32 8-16 0 1M0-6C8-25 24-34 42-31 24-21 12-10 0 4M0-6C-20-29-38-34-54-27-31-18-15-8 0 5" fill={NAVY} opacity=".92" />
    </g>
  );
}

function Window({ x, y, w = 28, h = 34, lit = false }: { x: number; y: number; w?: number; h?: number; lit?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={lit ? GOLD_2 : NAVY} />
      <path d={`M${x + w / 2} ${y + 2}V${y + h - 2}M${x + 2} ${y + h / 2}H${x + w - 2}`} stroke={WHITE} strokeOpacity=".35" strokeWidth="1.5" />
    </g>
  );
}

function Backdrop({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={NAVY} />
          <stop offset="1" stopColor={BLUE} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PALE} stopOpacity=".96" />
          <stop offset="1" stopColor={BLUE_2} stopOpacity=".42" />
        </linearGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PALE_2} />
          <stop offset="1" stopColor={WHITE} />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor={NAVY} floodOpacity=".16" />
        </filter>
      </defs>
      <rect width="640" height="360" rx="30" fill={WHITE} />
      <circle cx="332" cy="142" r="124" fill={`url(#${id}-blue)`} />
      <circle cx="456" cy="105" r="82" fill={PALE} opacity=".72" />
      <path d="M36 303C172 268 263 295 356 277C463 256 523 249 610 276V360H36Z" fill={`url(#${id}-ground)`} />
      <path d="M56 64H185M82 43l-10 10 10 10M585 79h-76" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity=".72" />
      <circle cx="74" cy="95" r="4" fill={GOLD} />
      <circle cx="545" cy="52" r="3" fill={GOLD_2} />
    </>
  );
}

function ApartmentArtwork() {
  return (
    <g filter="url(#appartement-shadow)">
      <path d="M146 286V116L274 80L274 286Z" fill={WHITE} />
      <path d="M274 286V66L455 100V286Z" fill={PALE_2} />
      <path d="M455 286V132L523 151V286Z" fill={WHITE} />
      <path d="M274 67L455 100V121L274 91Z" fill={GOLD_2} opacity=".72" />
      <path d="M146 116L274 80V101L146 137Z" fill={PALE} />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <Window x={168} y={137 + row * 48} w={31} h={31} lit={row === 1} />
          <Window x={217} y={123 + row * 51} w={31} h={33} />
          <Window x={302} y={117 + row * 51} w={34} h={34} lit={row === 0} />
          <Window x={354} y={126 + row * 49} w={34} h={34} />
          <Window x={407} y={136 + row * 47} w={28} h={32} lit={row === 2} />
        </g>
      ))}
      <path d="M138 169L458 115M138 220L458 166M138 270L458 218" stroke={GOLD} strokeWidth="4" opacity=".85" />
      <path d="M279 72V286M459 102V286" stroke={NAVY} strokeWidth="5" opacity=".2" />
      <rect x="283" y="235" width="54" height="51" rx="4" fill={NAVY} />
      <path d="M107 289H545" stroke={NAVY} strokeWidth="5" strokeLinecap="round" opacity=".18" />
      <Plant x={139} y={249} scale={1.05} />
      <Plant x={507} y={251} scale={.9} />
    </g>
  );
}

function VillaArtwork() {
  return (
    <g filter="url(#villa-shadow)">
      <Palm x={122} y={228} scale={.95} />
      <Palm x={526} y={231} scale={.82} />
      <rect x="154" y="154" width="348" height="122" rx="5" fill={WHITE} />
      <rect x="238" y="98" width="211" height="103" rx="4" fill={WHITE} />
      <path d="M238 98H449V119H238Z" fill={GOLD_2} opacity=".68" />
      <rect x="267" y="127" width="62" height="61" rx="4" fill={`url(#villa-glass)`} />
      <rect x="346" y="127" width="70" height="61" rx="4" fill={NAVY} />
      <rect x="174" y="181" width="95" height="78" rx="4" fill={`url(#villa-glass)`} />
      <rect x="290" y="204" width="85" height="55" rx="4" fill={PALE} />
      <rect x="394" y="181" width="87" height="78" rx="4" fill={NAVY} />
      <path d="M165 166H495M228 111V199M338 111V201M449 111V270" stroke={GOLD} strokeWidth="3" opacity=".92" />
      <path d="M113 286H541" stroke={NAVY} strokeWidth="5" strokeLinecap="round" opacity=".16" />
      <path d="M153 276H505L476 316H180Z" fill={BLUE} opacity=".83" />
      <path d="M172 284H486" stroke={WHITE} strokeWidth="3" opacity=".72" />
      <Plant x={476} y={248} scale={.8} />
    </g>
  );
}

function TerrainArtwork() {
  return (
    <g filter="url(#terrain-shadow)">
      <path d="M48 224C126 169 188 188 250 135C327 69 398 120 469 77C524 44 574 64 623 91V287H48Z" fill={PALE} />
      <path d="M48 247C133 202 211 224 286 172C365 117 424 148 494 110C550 79 590 95 623 115V287H48Z" fill={BLUE} opacity=".23" />
      <path d="M48 267C140 227 218 246 306 206C396 165 486 186 623 139V287H48Z" fill={NAVY} opacity=".42" />
      <path d="M102 285L242 223L470 243L562 294L364 325L157 313Z" fill={BLUE} opacity=".58" />
      <path d="M113 285L242 232L458 249L542 292L361 315L168 306Z" fill="none" stroke={GOLD_2} strokeWidth="8" strokeLinejoin="round" />
      <path d="M242 232L361 315M458 249L361 315" stroke={WHITE} strokeWidth="2" opacity=".45" />
      <g transform="translate(399 123)">
        <path d="M0 0C-36 0-63 27-63 61C-63 109 0 160 0 160S63 109 63 61C63 27 36 0 0 0Z" fill={GOLD} />
        <circle cx="0" cy="59" r="25" fill={WHITE} />
        <circle cx="0" cy="59" r="15" fill={PALE} />
      </g>
      <path d="M79 202c24-28 47-31 72-13M506 187c23-32 46-37 73-18" stroke={NAVY} strokeWidth="10" strokeLinecap="round" opacity=".75" />
      <path d="M82 218V168M105 220V158M530 207V151M555 210V141" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function StudioArtwork() {
  return (
    <g filter="url(#studio-shadow)">
      <path d="M112 291V112C112 67 148 31 193 31H457V291Z" fill={WHITE} />
      <path d="M146 291V132C146 91 177 59 218 59H455V291Z" fill={PALE_2} />
      <path d="M146 291V137C146 96 178 64 219 64H337V291Z" fill={WHITE} />
      <path d="M337 64H455V291H337Z" fill={NAVY} />
      <path d="M344 88H443V279H344Z" fill={PALE} opacity=".14" />
      <rect x="186" y="196" width="151" height="66" rx="13" fill={PALE} />
      <rect x="178" y="216" width="176" height="49" rx="11" fill={WHITE} />
      <rect x="201" y="192" width="56" height="34" rx="9" fill={NAVY} />
      <rect x="268" y="192" width="56" height="34" rx="9" fill={BLUE} opacity=".45" />
      <rect x="371" y="181" width="56" height="13" rx="6" fill={GOLD} />
      <rect x="381" y="194" width="36" height="52" rx="3" fill={PALE} />
      <path d="M225 91V166M225 91C225 78 235 68 248 68M398 92V164M398 92C398 80 388 70 376 70" stroke={GOLD} strokeWidth="3" />
      <circle cx="225" cy="169" r="10" fill={GOLD_2} />
      <circle cx="398" cy="167" r="10" fill={GOLD_2} />
      <Plant x={133} y={249} scale={1.05} />
      <Plant x={458} y={252} scale={.9} />
      <path d="M102 292H492" stroke={NAVY} strokeWidth="5" strokeLinecap="round" opacity=".16" />
    </g>
  );
}

function RiadArtwork() {
  return (
    <g filter="url(#riad-shadow)">
      <Palm x={118} y={224} scale={.82} />
      <Palm x={527} y={224} scale={.88} />
      <rect x="156" y="62" width="330" height="230" rx="8" fill={WHITE} />
      <path d="M198 292V166C198 111 243 66 298 66H344C399 66 444 111 444 166V292Z" fill={PALE_2} />
      <path d="M231 292V177C231 129 270 91 318 91H325C373 91 412 129 412 177V292Z" fill={WHITE} stroke={GOLD_2} strokeWidth="5" />
      <path d="M265 292V190C265 159 290 134 321 134C352 134 377 159 377 190V292Z" fill={NAVY} />
      <path d="M294 292V208C294 193 306 181 321 181C336 181 348 193 348 208V292Z" fill={GOLD_2} opacity=".72" />
      <path d="M176 83H466M176 108H466" stroke={BLUE} strokeWidth="5" strokeDasharray="4 7" opacity=".72" />
      {[177, 199, 221, 421, 443, 465].map((x, index) => (
        <circle key={x} cx={x} cy={96} r="5" fill={index % 2 ? GOLD : BLUE} />
      ))}
      <path d="M183 139h50v87h-50zM410 139h50v87h-50z" fill={PALE} />
      <path d="M193 149h30v67h-30zM420 149h30v67h-30z" fill={NAVY} opacity=".86" />
      <path d="M233 300H409L381 329H261Z" fill={BLUE} opacity=".82" />
      <path d="M268 305H374" stroke={WHITE} strokeWidth="3" opacity=".7" />
      <path d="M321 278V319" stroke={GOLD} strokeWidth="4" />
      <path d="M306 279C306 263 336 263 336 279C336 291 321 301 321 301S306 291 306 279Z" fill={GOLD_2} />
      <Plant x={170} y={253} scale={.78} />
      <Plant x={473} y={253} scale={.78} />
    </g>
  );
}

function OfficeArtwork() {
  return (
    <g filter="url(#bureau-shadow)">
      <path d="M142 286V101H490V286Z" fill={WHITE} />
      <path d="M307 101H490V286H307Z" fill={`url(#bureau-glass)`} />
      <path d="M318 115H480V274H318Z" fill={NAVY} opacity=".28" />
      <path d="M335 254V145M379 254V132M423 254V124M467 254V115" stroke={WHITE} strokeWidth="2" opacity=".48" />
      <path d="M318 194H480M318 232H480" stroke={WHITE} strokeWidth="2" opacity=".42" />
      <rect x="166" y="150" width="122" height="110" rx="4" fill={NAVY} />
      <path d="M176 163H278V207H176Z" fill={PALE} opacity=".22" />
      <rect x="180" y="220" width="94" height="11" rx="5" fill={GOLD} />
      <rect x="191" y="231" width="6" height="37" fill={NAVY} />
      <rect x="256" y="231" width="6" height="37" fill={NAVY} />
      <rect x="202" y="192" width="49" height="31" rx="3" fill={PALE} />
      <path d="M226 223V232" stroke={GOLD} strokeWidth="4" />
      <path d="M182 111V163M223 111V163M264 111V163" stroke={GOLD} strokeWidth="3" />
      <circle cx="182" cy="168" r="10" fill={GOLD_2} />
      <circle cx="223" cy="168" r="10" fill={GOLD_2} />
      <circle cx="264" cy="168" r="10" fill={GOLD_2} />
      <path d="M134 286H518" stroke={NAVY} strokeWidth="5" strokeLinecap="round" opacity=".16" />
      <Plant x={128} y={247} scale={.96} />
      <Plant x={509} y={249} scale={.78} />
    </g>
  );
}

function GenericHouseArtwork() {
  return (
    <g filter="url(#maison-shadow)">
      <path d="M159 168L321 62L483 168V291H159Z" fill={WHITE} />
      <path d="M204 151H438V291H204Z" fill={PALE_2} />
      <Window x={236} y={176} w={48} h={47} />
      <Window x={358} y={176} w={48} h={47} lit />
      <rect x="296" y="211" width="53" height="80" rx="5" fill={NAVY} />
      <path d="M153 170L321 57L489 170" stroke={GOLD} strokeWidth="9" strokeLinejoin="round" fill="none" />
      <Plant x={161} y={251} scale={1.05} />
      <Plant x={480} y={252} scale={.92} />
    </g>
  );
}

export function PropertyTypeArtwork({ kind, className = "", decorative = false }: PropertyTypeArtworkProps) {
  const optionAType = getOptionAPropertyType(kind);
  const normalized = kind.trim().toLowerCase();
  const id = (optionAType ?? (normalized.includes("maison") ? "maison" : "appartement")).toLowerCase();
  const label = optionAType ?? (normalized.includes("maison") ? "Maison" : "Bien immobilier");

  return (
    <svg
      viewBox="0 0 640 360"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Illustration premium ${label}`}
    >
      <Backdrop id={id} />
      {optionAType === "Appartement" ? <ApartmentArtwork /> : null}
      {optionAType === "Villa" ? <VillaArtwork /> : null}
      {optionAType === "Terrain" ? <TerrainArtwork /> : null}
      {optionAType === "Studio" ? <StudioArtwork /> : null}
      {optionAType === "Riad" ? <RiadArtwork /> : null}
      {optionAType === "Bureau" ? <OfficeArtwork /> : null}
      {!optionAType ? <GenericHouseArtwork /> : null}
    </svg>
  );
}
