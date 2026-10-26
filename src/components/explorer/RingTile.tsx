import type { CSSProperties } from "react";

export interface RingItem {
  id: string;
  title: string;
  /** Small label above the title: the level or form number. */
  kicker?: string;
  subtitle?: string;
  badge?: string;
  /** "r g b" colour of this tile's glow. */
  glow: string;
}

/** One neon tile. Used on the ring and in the list view, so both look the same. Its visible text is its accessible name. */
export function RingTile({
  item, active = false, tabIndex, onClick, className = "",
}: {
  item: RingItem;
  active?: boolean;
  tabIndex?: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`ring-tile ${className}`}
      data-active={active}
      data-id={item.id}
      style={{ "--glow": item.glow } as CSSProperties}
      tabIndex={tabIndex}
      onClick={onClick}
    >
      <span>
        {item.kicker && <span className="ring-kicker block">{item.kicker}</span>}
        <span className="ring-title mt-1 text-sm sm:text-base">{item.title}</span>
      </span>
      <span>
        {item.subtitle && <span className="ring-sub block">{item.subtitle}</span>}
        {item.badge && <span className="ring-sub mt-1 block font-medium text-slate-100">{item.badge}</span>}
      </span>
    </button>
  );
}
