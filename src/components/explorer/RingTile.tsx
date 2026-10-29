"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";

export interface RingItem {
  id: string;
  title: string;
  /** Small label above the title: the level or form number. */
  kicker?: string;
  subtitle?: string;
  badge?: string;
  /** "r g b" colour of this tile's glow. */
  glow: string;
  /** When set, the tile is a link to this address (opened in a new tab) instead of a button. */
  href?: string;
}

/**
 * One neon tile. Used on the ring and in the list view, so both look the same. Its visible text is its accessible name.
 * When the text is longer than the tile, the tile scrolls: with the mouse wheel while hovering, with a finger, or with the
 * arrow keys once focused. A fade at the bottom shows that there is more.
 */
export function RingTile({
  item, active = false, tabIndex, onClick, className = "",
}: {
  item: RingItem;
  active?: boolean;
  tabIndex?: number;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [more, setMore] = useState(false);

  // "More below" is true while part of the text is hidden under the bottom edge.
  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, item]);

  return (
    <span className="ring-tile-wrap" data-active={active} style={{ "--glow": item.glow } as CSSProperties}>
      <span ref={ref} className="ring-scroll" data-more={more} onScroll={measure}>
        {item.href ? (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            draggable={false}
            className={`ring-tile ${className}`}
            data-active={active}
            data-id={item.id}
            style={{ "--glow": item.glow, WebkitUserDrag: "none" } as CSSProperties}
            tabIndex={tabIndex}
            onClick={onClick}
          >
          <span>
            {item.kicker && <span className="ring-kicker block">{item.kicker}</span>}
            <span className="ring-title mt-1 block text-sm sm:text-base">{item.title}</span>
          </span>
          <span>
            {item.subtitle && <span className="ring-sub block">{item.subtitle}</span>}
            {item.badge && <span className="ring-sub mt-1 block font-medium text-slate-100">{item.badge}</span>}
          </span>
            <span className="sr-only">(opens the official site in a new tab)</span>
          </a>
        ) : (
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
            <span className="ring-title mt-1 block text-sm sm:text-base">{item.title}</span>
          </span>
          <span>
            {item.subtitle && <span className="ring-sub block">{item.subtitle}</span>}
            {item.badge && <span className="ring-sub mt-1 block font-medium text-slate-100">{item.badge}</span>}
          </span>
        </button>
        )}
      </span>
      {more && <span className="ring-more" aria-hidden>Scroll for more</span>}
    </span>
  );
}
