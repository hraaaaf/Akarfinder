type GoldenIllustrationProps = {
  kind: string;
  className?: string;
};

const PRIMARY = "#0B63CE";
const NAVY = "#0B1F3A";
const MID = "#5AA7F8";
const PALE = "#DCEEFF";
const SKY = "#EEF6FF";
const WHITE = "#FFFFFF";

function Motif({ kind }: { kind: string }) {
  const k = kind.toLowerCase();
  if (k.includes("villa")) return <><path d="M62 155 128 92l66 63v68H62Z" fill={WHITE}/><path d="M88 151h80v72H88z" fill={PALE}/><rect x="111" y="169" width="34" height="54" rx="10" fill={PRIMARY}/><path d="M183 131c19 8 29 25 25 45-20-1-36-13-43-31 4-7 10-11 18-14Z" fill={MID}/></>;
  if (k.includes("terrain") || k.includes("land")) return <><path d="m49 181 69-52 88 29-69 56Z" fill={WHITE}/><path d="m73 176 47-34 61 20-47 38Z" fill={PALE}/><path d="M85 185c23-13 48-16 79-8" stroke={PRIMARY} strokeWidth="9" strokeLinecap="round" fill="none"/><circle cx="181" cy="126" r="20" fill={MID}/></>;
  if (k.includes("riad")) return <><rect x="58" y="79" width="140" height="151" rx="28" fill={WHITE}/><path d="M91 230v-66c0-35 18-58 37-58s37 23 37 58v66" fill={PALE}/><path d="M107 230v-60c0-20 9-35 21-35s21 15 21 35v60" fill={PRIMARY}/><circle cx="128" cy="91" r="11" fill={MID}/></>;
  if (k.includes("apartment") || k.includes("appartement") || k.includes("studio") || k.includes("duplex") || k.includes("penthouse")) return <><rect x="69" y="60" width="118" height="174" rx="24" fill={WHITE}/><rect x="88" y="83" width="35" height="31" rx="8" fill={PALE}/><rect x="134" y="83" width="35" height="31" rx="8" fill={MID}/><rect x="88" y="126" width="35" height="31" rx="8" fill={MID}/><rect x="134" y="126" width="35" height="31" rx="8" fill={PALE}/><rect x="105" y="176" width="47" height="58" rx="12" fill={PRIMARY}/><path d="M187 96h22v138h-22" fill={NAVY} opacity=".12"/></>;
  if (k.includes("office") || k.includes("bureau")) return <><path d="M70 68h111l20 31v135H70Z" fill={WHITE}/><path d="M181 68v31h20" fill={MID}/><g fill={PALE}><rect x="91" y="99" width="31" height="26" rx="7"/><rect x="132" y="99" width="31" height="26" rx="7"/><rect x="91" y="138" width="31" height="26" rx="7"/><rect x="132" y="138" width="31" height="26" rx="7"/></g><rect x="108" y="181" width="48" height="53" rx="12" fill={PRIMARY}/></>;
  if (k.includes("commercial") || k.includes("commerce")) return <><rect x="54" y="91" width="148" height="140" rx="24" fill={WHITE}/><path d="M48 116h160l-16-42H64Z" fill={MID}/><path d="M61 116h27v26c0 13-27 13-27 0Zm54 0h27v26c0 13-27 13-27 0Zm54 0h27v26c0 13-27 13-27 0Z" fill={PRIMARY}/><rect x="82" y="162" width="94" height="69" rx="15" fill={PALE}/></>;
  if (k.includes("farm") || k.includes("ferme")) return <><path d="M54 164 128 98l74 66v68H54Z" fill={WHITE}/><path d="M95 232v-59h66v59" fill={PRIMARY}/><path d="M62 232c9-28 25-46 45-58M194 232c-9-28-25-46-45-58" stroke={MID} strokeWidth="10" strokeLinecap="round"/><circle cx="201" cy="88" r="23" fill={PALE}/></>;
  if (k.includes("house") || k.includes("maison") || k.includes("new-development")) return <><path d="M48 151 128 77l80 74v81H48Z" fill={WHITE}/><path d="M85 143h86v89H85z" fill={PALE}/><rect x="108" y="169" width="40" height="63" rx="12" fill={PRIMARY}/><path d="m169 101 24 22v-44h-24Z" fill={MID}/></>;
  if (k.includes("mortgage") || k.includes("credit")) return <><path d="M54 142 128 83l74 59v78H54Z" fill={WHITE}/><rect x="100" y="161" width="56" height="59" rx="14" fill={PALE}/><circle cx="183" cy="88" r="37" fill={PRIMARY}/><path d="M174 88h20M184 77v22" stroke={WHITE} strokeWidth="8" strokeLinecap="round"/></>;
  if (k.includes("agency") || k.includes("agence") || k.includes("developer") || k.includes("promoteur")) return <><rect x="54" y="75" width="148" height="157" rx="28" fill={WHITE}/><path d="M78 145c19-31 40-31 59 0 19-31 40-31 59 0" stroke={PRIMARY} strokeWidth="16" strokeLinecap="round" fill="none"/><circle cx="101" cy="110" r="22" fill={MID}/><circle cx="157" cy="110" r="22" fill={PALE}/><path d="M85 193h86" stroke={NAVY} strokeWidth="12" strokeLinecap="round"/></>;
  if (k.includes("buy") || k.includes("acheter")) return <><path d="M47 151 117 88l70 63v75H47Z" fill={WHITE}/><rect x="91" y="167" width="51" height="59" rx="13" fill={PALE}/><circle cx="190" cy="103" r="34" fill={PRIMARY}/><path d="m175 103 10 10 21-23" stroke={WHITE} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>;
  if (k.includes("rent") || k.includes("louer")) return <><path d="M53 149 121 91l68 58v78H53Z" fill={WHITE}/><rect x="97" y="167" width="48" height="60" rx="13" fill={PALE}/><circle cx="192" cy="107" r="31" fill={MID}/><path d="M183 107h18M192 98v18" stroke={NAVY} strokeWidth="7" strokeLinecap="round"/></>;
  if (k.includes("sell") || k.includes("vendre")) return <><path d="M49 151 116 92l67 59v75H49Z" fill={WHITE}/><rect x="93" y="168" width="47" height="58" rx="13" fill={PALE}/><path d="m158 91 50 16-13 51-50-16Z" fill={PRIMARY}/><circle cx="184" cy="117" r="7" fill={WHITE}/></>;
  if (k.includes("map") || k.includes("quartier") || k.includes("neighborhood")) return <><path d="m53 83 49-18 52 20 49-18v150l-49 18-52-20-49 18Z" fill={WHITE}/><path d="M102 65v150M154 85v150" stroke={PALE} strokeWidth="10"/><path d="M128 112c-20 0-35 15-35 34 0 29 35 59 35 59s35-30 35-59c0-19-15-34-35-34Z" fill={PRIMARY}/><circle cx="128" cy="146" r="11" fill={WHITE}/></>;
  if (k.includes("compare")) return <><rect x="53" y="79" width="64" height="150" rx="22" fill={WHITE}/><rect x="139" y="79" width="64" height="150" rx="22" fill={PALE}/><path d="M80 119h30M146 119h30M80 150h23M146 150h38M80 181h34M146 181h26" stroke={PRIMARY} strokeWidth="9" strokeLinecap="round"/></>;
  if (k.includes("valuation") || k.includes("estimation")) return <><path d="M50 153 114 95l64 58v74H50Z" fill={WHITE}/><rect x="91" y="172" width="46" height="55" rx="12" fill={PALE}/><circle cx="187" cy="108" r="36" fill={PRIMARY}/><path d="M167 108h40M187 88v40" stroke={WHITE} strokeWidth="7" strokeLinecap="round"/></>;
  if (k.includes("alert")) return <><path d="M128 66c-35 0-58 27-58 63v42l-19 25h154l-19-25v-42c0-36-23-63-58-63Z" fill={WHITE}/><path d="M93 199h70c-4 22-20 35-35 35s-31-13-35-35Z" fill={PRIMARY}/><circle cx="190" cy="83" r="25" fill={MID}/></>;
  if (k.includes("companion") || k.includes("projet") || k.includes("project")) return <><circle cx="128" cy="145" r="79" fill={WHITE}/><path d="M128 82c36 0 63 28 63 63s-27 63-63 63-63-28-63-63 27-63 63-63Z" fill={PALE}/><path d="m128 106 15 27 31 6-21 23 4 32-29-13-29 13 4-32-21-23 31-6Z" fill={PRIMARY}/></>;
  return <><rect x="58" y="63" width="140" height="166" rx="30" fill={WHITE}/><circle cx="128" cy="124" r="39" fill={PALE}/><path d="M91 193h74" stroke={PRIMARY} strokeWidth="14" strokeLinecap="round"/><circle cx="184" cy="83" r="22" fill={MID}/></>;
}

export function GoldenIllustration({ kind, className = "" }: GoldenIllustrationProps) {
  return (
    <svg viewBox="0 0 256 256" role="img" aria-label={kind} className={className}>
      <rect width="256" height="256" rx="42" fill={SKY}/>
      <path d="M-12 212C52 174 83 204 127 184c50-22 70-64 141-56v140H-12Z" fill={PALE}/>
      <circle cx="211" cy="48" r="36" fill={MID} opacity=".18"/>
      <circle cx="45" cy="56" r="19" fill={PRIMARY} opacity=".12"/>
      <Motif kind={kind}/>
      <path d="M32 231h192" stroke={NAVY} strokeWidth="7" strokeLinecap="round" opacity=".12"/>
    </svg>
  );
}
