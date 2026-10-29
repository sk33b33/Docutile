"use client";

import { LayoutGrid, Orbit } from "lucide-react";
import { RingCarousel } from "@/components/explorer/RingCarousel";
import type { RingItem } from "@/components/explorer/RingTile";
import { Button } from "@/components/ui/Button";
import { glowForCategory } from "@/lib/carousel/glow";
import { portalTiles } from "@/lib/portals";
import { useViewPreference } from "@/lib/view-preference";
import { PortalLinks } from "./PortalLinks";

const ITEMS: RingItem[] = portalTiles().map((p) => ({
  id: p.id,
  title: p.name,
  kicker: p.appliesTo,
  subtitle: p.what,
  glow: glowForCategory(p.categories[0], 0),
  href: p.url,
}));

/** The official portals as a ring of tiles (each one a link to the official site), or the grouped list. */
export function PortalsCarousel() {
  const [view, setView] = useViewPreference("docutile:portals-view");
  return (
    <div>
      <div role="group" aria-label="Portals view" className="flex gap-1">
        <Button size="sm" variant={view === "carousel" ? "primary" : "secondary"} aria-pressed={view === "carousel"} onClick={() => setView("carousel")}>
          <Orbit className="h-4 w-4" aria-hidden /> Carousel
        </Button>
        <Button size="sm" variant={view === "list" ? "primary" : "secondary"} aria-pressed={view === "list"} onClick={() => setView("list")}>
          <LayoutGrid className="h-4 w-4" aria-hidden /> List
        </Button>
      </div>
      <div className="mt-3">
        {view === "carousel"
          ? <RingCarousel items={ITEMS} label="Official portals" onSelect={() => undefined} intro={false} />
          : <PortalLinks />}
      </div>
    </div>
  );
}
