import Image from "next/image";
import Link from "next/link";

// Zones cliquables sur le desktop (image 1586×992)
// Le panneau carte est à droite (~37% à ~98% de la largeur)
const desktopPins = [
  { city: "Tanger",     href: "/search?city=Tanger",     top: "15%", left: "69%" },
  { city: "Fès",        href: "/search?city=F%C3%A8s",   top: "31%", left: "74%" },
  { city: "Rabat",      href: "/search?city=Rabat",      top: "30%", left: "59%" },
  { city: "Casablanca", href: "/search?city=Casablanca", top: "39%", left: "56%" },
  { city: "Marrakech",  href: "/search?city=Marrakech",  top: "51%", left: "64%" },
  { city: "Agadir",     href: "/search?city=Agadir",     top: "60%", left: "52%" },
];

// Zones cliquables sur les pins de la carte mobile (image 941×1672)
const mobilePins = [
  { city: "Tanger",     href: "/search?city=Tanger",     top: "27%", left: "64%" },
  { city: "Fès",        href: "/search?city=F%C3%A8s",   top: "35%", left: "73%" },
  { city: "Rabat",      href: "/search?city=Rabat",      top: "33%", left: "50%" },
  { city: "Casablanca", href: "/search?city=Casablanca", top: "37%", left: "46%" },
  { city: "Marrakech",  href: "/search?city=Marrakech",  top: "44%", left: "59%" },
  { city: "Agadir",     href: "/search?city=Agadir",     top: "50%", left: "36%" },
];

// Zones cliquables sur les lignes "Explorer [Ville]" mobile
const mobileCityRows = [
  { city: "Casablanca", href: "/search?city=Casablanca", top: "61.5%", height: "5.8%" },
  { city: "Rabat",      href: "/search?city=Rabat",      top: "67.3%", height: "5.8%" },
  { city: "Tanger",     href: "/search?city=Tanger",     top: "73.1%", height: "5.8%" },
  { city: "Fès",        href: "/search?city=F%C3%A8s",   top: "78.9%", height: "5.8%" },
  { city: "Marrakech",  href: "/search?city=Marrakech",  top: "84.7%", height: "5.8%" },
  { city: "Agadir",     href: "/search?city=Agadir",     top: "90.5%", height: "5.8%" },
];

const ALL_CITIES = [
  { city: "Casablanca", href: "/search?city=Casablanca" },
  { city: "Rabat",      href: "/search?city=Rabat" },
  { city: "Tanger",     href: "/search?city=Tanger" },
  { city: "Fès",        href: "/search?city=F%C3%A8s" },
  { city: "Marrakech",  href: "/search?city=Marrakech" },
  { city: "Agadir",     href: "/search?city=Agadir" },
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

      {/* Mobile — image 941×1672, map + liste des villes */}
      <div className="relative lg:hidden">
        <Image
          src="/images/map-section-mobile.png"
          alt="Carte indicative de l'immobilier marocain — villes principales"
          width={941}
          height={1672}
          className="w-full"
          priority={false}
        />

        {/* Zones sur les pins de la carte */}
        {mobilePins.map(({ city, href, top, left }) => (
          <Link
            key={`pin-${city}`}
            href={href}
            aria-label={`Explorer les annonces à ${city}`}
            className="group absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
            style={{ top, left }}
          >
            <span className="absolute inset-0 rounded-full bg-transparent transition duration-300 group-hover:bg-white/[0.1]" />
          </Link>
        ))}

        {/* Zones sur les lignes "Explorer [Ville]" */}
        {mobileCityRows.map(({ city, href, top, height }) => (
          <Link
            key={`row-${city}`}
            href={href}
            aria-label={`Explorer les annonces à ${city}`}
            className="absolute left-0 w-full cursor-pointer"
            style={{ top, height }}
          />
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
