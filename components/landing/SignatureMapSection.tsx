import Image from "next/image";
import Link from "next/link";

const desktopPins = [
  { city: "Tanger",     href: "/search?city=Tanger",     top: "38%", left: "72%" },
  { city: "Fès",        href: "/search?city=F%C3%A8s",   top: "43%", left: "74%" },
  { city: "Rabat",      href: "/search?city=Rabat",      top: "43%", left: "58%" },
  { city: "Casablanca", href: "/search?city=Casablanca", top: "47%", left: "56%" },
  { city: "Marrakech",  href: "/search?city=Marrakech",  top: "55%", left: "53%" },
  { city: "Agadir",     href: "/search?city=Agadir",     top: "63%", left: "44%" },
];

// Overlays sur les boutons "Explorez les villes" en bas de l'image carte intelligente mobile
const mobileCityCards = [
  { city: "Casablanca", href: "/search?city=Casablanca", top: "63%", height: "10%" },
  { city: "Rabat",      href: "/search?city=Rabat",      top: "73%", height: "10%" },
  { city: "Tanger",     href: "/search?city=Tanger",     top: "73%", height: "10%" },
  { city: "Fès",        href: "/search?city=F%C3%A8s",   top: "83%", height: "10%" },
  { city: "Marrakech",  href: "/search?city=Marrakech",  top: "83%", height: "10%" },
  { city: "Agadir",     href: "/search?city=Agadir",     top: "63%", height: "10%" },
];

export function SignatureMapSection() {
  return (
    <section id="signature-map">
      {/* Desktop */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/map-section-desktop.png"
          alt="Carte intelligente de l'immobilier marocain"
          width={1280}
          height={836}
          className="w-full"
          priority={false}
        />
        {desktopPins.map(({ city, href, top, left }) => (
          <Link
            key={city}
            href={href}
            aria-label={`Explorer les annonces à ${city}`}
            className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ top, left }}
          />
        ))}
      </div>

      {/* Mobile */}
      <div className="relative lg:hidden">
        <Image
          src="/images/map-section-mobile.png"
          alt="Carte indicative de l'immobilier marocain — villes principales avec repères de prix"
          width={390}
          height={692}
          className="w-full"
          priority={false}
        />
        {mobileCityCards.map(({ city, href, top, height }) => (
          <Link
            key={city}
            href={href}
            aria-label={`Explorer les annonces à ${city}`}
            className="absolute left-0 w-full"
            style={{ top, height }}
          />
        ))}
      </div>
    </section>
  );
}
