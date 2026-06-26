import Image from "next/image";
import Link from "next/link";

// Zones cliquables sur le desktop (image 1586×992)
const desktopPins = [
  { city: "Tanger",     href: "/map?city=Tanger",     top: "15%", left: "69%" },
  { city: "Fès",        href: "/map?city=F%C3%A8s",   top: "31%", left: "74%" },
  { city: "Rabat",      href: "/map?city=Rabat",      top: "30%", left: "59%" },
  { city: "Casablanca", href: "/map?city=Casablanca", top: "39%", left: "56%" },
  { city: "Marrakech",  href: "/map?city=Marrakech",  top: "51%", left: "64%" },
  { city: "Agadir",     href: "/map?city=Agadir",     top: "60%", left: "52%" },
];

// Pins visuels sur la carte mobile (image 941×1672)
// Les mobileCityRows (zones bas d'image) sont supprimées — trop décalées sur iPhone
const mobilePins = [
  { city: "Tanger",     href: "/map?city=Tanger",     top: "27%", left: "64%" },
  { city: "Fès",        href: "/map?city=F%C3%A8s",   top: "35%", left: "73%" },
  { city: "Rabat",      href: "/map?city=Rabat",      top: "33%", left: "50%" },
  { city: "Casablanca", href: "/map?city=Casablanca", top: "37%", left: "46%" },
  { city: "Marrakech",  href: "/map?city=Marrakech",  top: "44%", left: "59%" },
  { city: "Agadir",     href: "/map?city=Agadir",     top: "50%", left: "36%" },
];

const ALL_CITIES = [
  { city: "Casablanca", href: "/map?city=Casablanca" },
  { city: "Rabat",      href: "/map?city=Rabat" },
  { city: "Tanger",     href: "/map?city=Tanger" },
  { city: "Fès",        href: "/map?city=F%C3%A8s" },
  { city: "Marrakech",  href: "/map?city=Marrakech" },
  { city: "Agadir",     href: "/map?city=Agadir" },
];

export function SignatureMapSection() {
  return (
    <section id="signature-map">
      {/* Desktop — image 1586×992, map on right panel */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/map-section-desktop.png"
          alt="Carte intelligente de l'immobilier marocain — Casablanca, Rabat, Tanger, Fès, Marrakech, Agadir"
          width={1586}
          height={992}
          className="w-full"
          priority={false}
        />
        {desktopPins.map(({ city, href, top, left }) => (
          <Link
            key={city}
            href={href}
            aria-label={`Explorer les annonces à ${city}`}
            className="group absolute h-14 w-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-2xl"
            style={{ top, left }}
          >
            <span className="absolute inset-0 rounded-2xl bg-transparent transition duration-300 group-hover:bg-white/[0.08]" />
          </Link>
        ))}

        {/* CTA "Explorer les annonces" — bouton doré en bas à gauche */}
        <Link
          href="/search"
          aria-label="Explorer les annonces"
          className="absolute h-[8%] w-[22%] cursor-pointer rounded-2xl"
          style={{ bottom: "5%", left: "4%" }}
        />
      </div>

      {/* Mobile — image 941×1672, pins badge directement sur la carte */}
      <div className="relative lg:hidden">
        <Image
          src="/images/map-section-mobile.png"
          alt="Carte indicative de l'immobilier marocain — villes principales"
          width={941}
          height={1672}
          className="w-full"
          priority={false}
        />

        {mobilePins.map(({ city, href, top, left }) => (
          <Link
            key={`pin-${city}`}
            href={href}
            aria-label={`Explorer les annonces immobilières à ${city}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2A368]"
            style={{ top, left }}
          >
            <span className="flex items-center gap-1 rounded-full border border-[#C2A368]/45 bg-[#071B33]/78 px-2 py-1 backdrop-blur-sm transition duration-200 group-hover:border-[#C2A368]/80 group-hover:bg-[#071B33] group-hover:shadow-[0_0_10px_rgba(194,163,104,0.4)]">
              <span className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-[#C2A368] shadow-[0_0_5px_rgba(194,163,104,0.9)]" />
              <span className="text-[9px] font-extrabold tracking-[0.06em] text-white/90">
                {city}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* Accessibilité */}
      <ul className="sr-only">
        {ALL_CITIES.map(({ city, href }) => (
          <li key={city}>
            <Link href={href}>Explorer les annonces à {city}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
