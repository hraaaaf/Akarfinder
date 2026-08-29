import { SiteFooter } from "@/components/landing/SiteFooter";
import { ComparePageShell } from "@/components/compare/ComparePageShell";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";
import "./p1-polish.css";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  return (
    <main className={`min-h-screen ${ui.pageLight}`} data-p1-compare>
      <SiteHeader searchMode fluid />
      <Container>
        <ComparePageShell />
      </Container>
      <SiteFooter />
    </main>
  );
}
