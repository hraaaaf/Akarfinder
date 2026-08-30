import { getIndexedPropertyTypeVisual } from "@/lib/ux/indexed-property-type-visual";

export function IndexedPropertyTypeArtwork({
  propertyType,
  title,
  className = "",
}: {
  propertyType: string | null | undefined;
  title?: string | null;
  className?: string;
}) {
  const visual = getIndexedPropertyTypeVisual(propertyType, title);
  const stroke = visual.foreground;

  return (
    <div
      data-indexed-property-artwork={visual.key}
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ backgroundColor: "#fff", color: visual.foreground }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 190"
        className="absolute inset-0 h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="320" height="190" fill="#fff" />
        <ellipse cx="160" cy="154" rx="126" ry="19" fill={visual.wash} />

        {visual.key === "apartment" ? (
          <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
            <g strokeOpacity="0.14" strokeWidth="0.7">
              <path d="M16 151H69M30 151V124H50V151M50 151V133H65V151" />
              <path d="M255 151V128H278V151M278 151V116H300V151" />
              <path d="M24 76H49M29 72C33 66 41 66 45 72" />
              <path d="M256 74H284M262 70C266 64 273 64 277 70" />
            </g>
            <g strokeWidth="0.9">
              <path d="M91 151V77L151 59L214 77V151" />
              <path d="M102 151V84L151 70L203 84V151" strokeOpacity="0.52" />
              <path d="M91 91H214M91 109H214M91 127H214" strokeOpacity="0.55" />
              <path d="M117 78V151M145 70V151M174 71V151M201 79V151" strokeOpacity="0.55" />
              <path d="M107 96H124V104H107M134 96H151V104H134M162 96H179V104H162M189 96H205V104H189" strokeWidth="0.62" />
              <path d="M107 114H124V122H107M134 114H151V122H134M162 114H179V122H162M189 114H205V122H189" strokeWidth="0.62" />
              <path d="M107 132H124V140H107M134 132H151V140H134M162 132H179V140H162M189 132H205V140H189" strokeWidth="0.62" />
              <path d="M82 151H226" strokeWidth="1.05" />
            </g>
            <g strokeOpacity="0.38" strokeWidth="0.72">
              <path d="M70 151V132M63 151H77M70 132C62 132 59 124 63 118C67 112 74 112 78 118C82 124 78 132 70 132Z" />
              <path d="M234 151V130M226 151H242M234 130C226 130 223 122 227 116C231 110 238 110 242 116C246 122 242 130 234 130Z" />
            </g>
          </g>
        ) : visual.key === "villa" ? (
          <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
            <g strokeOpacity="0.13" strokeWidth="0.7">
              <path d="M22 153H70M250 153H301" />
              <path d="M30 76H54M35 72C39 66 46 66 50 72" />
              <path d="M264 75H291M270 70C274 65 281 65 285 70" />
            </g>
            <g strokeWidth="0.9">
              <path d="M80 153V102L160 68L240 102V153" />
              <path d="M68 104L160 61L252 104" strokeWidth="0.82" />
              <path d="M112 153V112H208V153" strokeOpacity="0.34" />
              <path d="M137 153V119C137 107 146 98 158 98H162C174 98 183 107 183 119V153" />
              <path d="M98 116H122V137H98ZM198 116H222V137H198Z" strokeWidth="0.72" />
              <path d="M151 121H169V153H151Z" strokeWidth="0.75" />
              <path d="M57 153H263" strokeWidth="1.05" />
              <path d="M70 153V126M250 153V126" strokeOpacity="0.5" />
              <path d="M70 126C58 120 59 105 70 99C81 105 82 120 70 126ZM250 126C238 120 239 105 250 99C261 105 262 120 250 126Z" strokeOpacity="0.5" />
              <path d="M88 153V138H110V153M210 153V138H232V153" strokeOpacity="0.36" />
            </g>
          </g>
        ) : visual.key === "land" ? (
          <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
            <g strokeOpacity="0.14" strokeWidth="0.68">
              <path d="M25 78H51M31 73C35 67 43 67 47 73" />
              <path d="M250 79H280M256 74C260 68 268 68 272 74" />
              <path d="M42 145C61 137 76 136 91 141M231 142C247 135 264 136 282 145" />
            </g>
            <path d="M67 139L140 111L257 127L184 158L67 139Z" strokeWidth="1" />
            <path d="M67 139L67 149M140 111V121M257 127V137M184 158V168" strokeWidth="0.95" />
            <path d="M94 129V140M119 119V130M220 122V133M238 126V137M155 151V162" strokeWidth="0.64" strokeOpacity="0.72" />
            <path d="M67 139L184 158M140 111L257 127" strokeOpacity="0.24" strokeWidth="0.68" strokeDasharray="3 4" />
            <path d="M166 73C154 73 146 82 146 93C146 109 166 126 166 126C166 126 186 109 186 93C186 82 178 73 166 73Z" fill={visual.wash} strokeWidth="1.05" />
            <circle cx="166" cy="93" r="6" strokeWidth="0.8" />
            <g strokeOpacity="0.34" strokeWidth="0.72">
              <path d="M48 140V120M41 140H55M48 120C41 120 38 113 41 108C44 103 51 103 54 108C57 113 55 120 48 120Z" />
              <path d="M275 142V119M268 142H282M275 119C268 119 265 112 268 107C271 102 278 102 281 107C284 112 282 119 275 119Z" />
            </g>
          </g>
        ) : visual.key === "office" ? (
          <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
            <g strokeOpacity="0.12" strokeWidth="0.68">
              <path d="M20 153H73M246 153H302" />
              <path d="M28 78H54M34 73C38 67 46 67 50 73" />
            </g>
            <g strokeWidth="0.9">
              <path d="M103 153V76L159 57V153" />
              <path d="M159 57L219 79V153H159" />
              <path d="M114 86L149 75M114 101L149 91M114 117L149 106M114 133L149 122" strokeOpacity="0.56" />
              <path d="M171 76L208 89M171 92L208 105M171 108L208 121M171 124L208 137" strokeOpacity="0.56" />
              <path d="M126 72V153M143 66V153M178 64V153M196 71V153" strokeOpacity="0.36" />
              <path d="M87 153H235" strokeWidth="1.05" />
              <path d="M134 153V136H186V153" strokeWidth="0.78" />
            </g>
            <g strokeOpacity="0.32" strokeWidth="0.7">
              <path d="M78 153V132M71 153H85M78 132C71 132 68 125 72 119C75 114 81 114 84 119C88 125 85 132 78 132Z" />
              <path d="M241 153V135M235 153H247M241 135C235 135 232 129 235 124C238 119 244 119 247 124C250 129 247 135 241 135Z" />
            </g>
          </g>
        ) : visual.key === "commercial" ? (
          <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
            <g strokeOpacity="0.13" strokeWidth="0.68">
              <path d="M20 153H72M248 153H301" />
              <path d="M29 77H54M35 72C39 66 47 66 51 72" />
              <path d="M258 77H284M264 72C268 66 276 66 280 72" />
            </g>
            <g strokeWidth="0.9">
              <path d="M81 153V89H239V153" />
              <path d="M76 89H244L234 72H86L76 89Z" fill={visual.wash} />
              <path d="M86 72H234" />
              <path d="M83 89C83 98 96 98 96 89C96 98 109 98 109 89C109 98 122 98 122 89C122 98 135 98 135 89C135 98 148 98 148 89C148 98 161 98 161 89C161 98 174 98 174 89C174 98 187 98 187 89C187 98 200 98 200 89C200 98 213 98 213 89C213 98 226 98 226 89" strokeWidth="0.75" />
              <path d="M96 105H165V142H96ZM177 105H224V153H177Z" strokeWidth="0.78" />
              <path d="M103 112H158M103 121H158M103 130H158" strokeOpacity="0.25" strokeWidth="0.6" />
              <circle cx="213" cy="129" r="1.7" fill={stroke} stroke="none" />
              <path d="M67 153H253" strokeWidth="1.05" />
              <path d="M63 153V125M57 125H69M60 120H66" strokeOpacity="0.45" strokeWidth="0.72" />
              <path d="M257 153V132M249 153H265M249 132H265V145H249Z" strokeOpacity="0.38" strokeWidth="0.72" />
            </g>
          </g>
        ) : visual.key === "riad" ? (
          <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
            <g strokeOpacity="0.12" strokeWidth="0.68">
              <path d="M20 154H67M253 154H302" />
              <path d="M26 76H51M32 71C36 65 44 65 48 71" />
            </g>
            <g strokeWidth="0.88">
              <path d="M74 154V94H246V154" />
              <path d="M86 94V77H234V94" />
              <path d="M117 154V111C117 94 129 82 146 82H174C191 82 203 94 203 111V154" />
              <path d="M127 154V114C127 102 136 93 148 93H172C184 93 193 102 193 114V154" strokeOpacity="0.48" />
              <path d="M91 112C91 102 98 95 108 95C118 95 125 102 125 112V154H91V112ZM195 112C195 102 202 95 212 95C222 95 229 102 229 112V154H195V112Z" strokeOpacity="0.55" />
              <path d="M146 82V69H174V82M153 69V61H167V69" />
              <path d="M57 154H263" strokeWidth="1.05" />
              <ellipse cx="160" cy="149" rx="25" ry="7" fill={visual.wash} />
              <path d="M144 146C144 136 151 130 160 130C169 130 176 136 176 146" strokeWidth="0.72" />
              <path d="M160 130V116M155 120L160 115L165 120" strokeWidth="0.72" />
            </g>
            <g strokeOpacity="0.38" strokeWidth="0.7">
              <path d="M56 154V124M50 154H62M56 124C48 119 48 108 56 102C64 108 64 119 56 124Z" />
              <path d="M266 154V124M260 154H272M266 124C258 119 258 108 266 102C274 108 274 119 266 124Z" />
            </g>
          </g>
        ) : (
          <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.95">
            <path d="M98 151V105L160 70L222 105V151" />
            <path d="M89 104L160 63L231 104" strokeOpacity="0.62" />
            <path d="M133 151V119H187V151" strokeOpacity="0.5" />
            <path d="M75 151H245" />
          </g>
        )}

        <path d="M22 163H298" stroke={stroke} strokeOpacity="0.055" strokeWidth="0.6" />
      </svg>

      <div
        className="absolute left-3 top-3 rounded-[6px] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.04em] text-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.05em]"
        style={{ backgroundColor: visual.accent }}
      >
        {visual.label}
      </div>

      <div
        className="absolute left-1/2 top-[14px] -translate-x-1/2 whitespace-nowrap text-[6px] font-black uppercase tracking-[0.025em] sm:top-[18px] sm:text-[9px] sm:tracking-[0.08em]"
        style={{ color: visual.foreground }}
      >
        Annonce indexée
      </div>

      <style jsx global>{`
        [data-indexed-artwork-card="true"] {
          border-radius: 16px !important;
          border-color: #e6eaf0 !important;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.065) !important;
          background: #fff !important;
        }
        [data-indexed-artwork-card="true"] [data-card-image] {
          height: 190px !important;
          background: #fff !important;
          border-bottom: 1px solid #f1f3f6;
        }
        [data-indexed-artwork-card="true"] [data-card-image] > .left-2.top-2,
        [data-indexed-artwork-card="true"] [data-card-image] > .left-3.top-3,
        [data-indexed-artwork-card="true"] [data-indexed-artwork-disclosure],
        [data-indexed-artwork-card="true"] [data-card-image] > span.bottom-2.left-2,
        [data-indexed-artwork-card="true"] [data-card-image] > span.bottom-3.left-3 {
          display: none !important;
        }
        [data-indexed-artwork-card="true"] [data-card-price] {
          font-weight: 800 !important;
          letter-spacing: -0.035em !important;
          line-height: 1 !important;
          font-variant-numeric: tabular-nums;
        }
        [data-indexed-artwork-card="true"] [data-card-price] + p { display: none !important; }
        [data-indexed-artwork-card="true"] [data-card-title] {
          color: #0f172a !important;
          font-weight: 800 !important;
          letter-spacing: -0.012em !important;
        }
        [data-indexed-artwork-card="true"] [data-card-location] {
          color: #667085 !important;
          font-weight: 600 !important;
        }
        [data-indexed-artwork-card="true"] [data-card-facts] {
          gap: 0.5rem !important;
          color: #475569 !important;
          overflow: visible !important;
          font-weight: 650 !important;
        }
        [data-indexed-artwork-card="true"] [data-card-facts] > span {
          border: 0 !important;
          background: transparent !important;
          border-radius: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        [data-indexed-artwork-card="true"] [data-card-facts] > span:not(:last-child)::after {
          content: "·";
          margin-left: 0.5rem;
          color: #c7cdd6;
        }
        [data-indexed-artwork-card="true"] [data-card-provenance] {
          margin-top: 0.8rem !important;
          padding-top: 0.75rem !important;
          border-top-color: #edf0f4 !important;
          font-weight: 700 !important;
        }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="apartment"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="apartment"]) [data-card-provenance] { color: #1769e0 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="villa"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="villa"]) [data-card-provenance] { color: #16843a !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="land"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="land"]) [data-card-provenance] { color: #ea6a00 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="office"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="office"]) [data-card-provenance] { color: #7352c7 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="commercial"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="commercial"]) [data-card-provenance] { color: #008ca3 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="riad"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="riad"]) [data-card-provenance] { color: #b98213 !important; }
        @media (max-width: 639px) {
          [data-indexed-artwork-card="true"] [data-card-image] { height: 164px !important; }
          [data-indexed-artwork-card="true"] [data-card-facts] {
            gap: 0.25rem !important;
            font-size: 9px !important;
          }
          [data-indexed-artwork-card="true"] [data-card-facts] > span:not(:last-child)::after {
            margin-left: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}
