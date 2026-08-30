import { SiteFooter } from "@/components/landing/SiteFooter";
import { FavoritesPageShell } from "@/components/favorites/FavoritesPageShell";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";
import "./p1-polish.css";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return (
    <main className={`min-h-screen ${ui.pageLight}`} data-p1-favorites>
      <SiteHeader searchMode fluid />
      <Container>
        <FavoritesPageShell />
      </Container>
      <SiteFooter />
    </main>
  );
}
