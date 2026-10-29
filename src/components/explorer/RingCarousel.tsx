"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { MAX_SPEED, clampSpeed, motionTo, nearestIndex, stepMotion, tileTransform, type Motion, type RingGeometry } from "@/lib/carousel/physics";
import { RingTile, type RingItem } from "./RingTile";

const DRAG_THRESHOLD_PX = 6;

interface Layout { width: number; tileW: number; tileH: number; geo: RingGeometry; pxPerTile: number; height: number }

function layoutFor(width: number, n: number): Layout {
  const tileW = Math.max(128, Math.min(184, width * 0.2));
  const tileH = Math.max(142, Math.round(tileW * 0.92));
  const push = tileW * 0.3;
  // The ring must leave room for the side tiles to sit fully inside the stage, even on a phone.
  const fit = width / 2 - tileW * 0.45 - push * 0.55;
  const radius = Math.max(60, Math.min(420, width * 0.34, fit));
  const rise = radius * 0.14;
  // How far the pointer travels for one tile to pass the centre: roughly the gap between neighbouring tiles.
  const pxPerTile = Math.max(80, Math.min(220, (radius * 2 * Math.PI) / Math.max(n, 3)));
  return { width, tileW, tileH, geo: { radius, rise, push }, pxPerTile, height: Math.round(tileH * 1.3 + rise + 40) };
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Tiles on a flat ring, the centre one largest. Drag or flick to spin: it coasts, slows, and the nearest tile
 * locks into the centre and hovers. Keyboard and buttons do the same without a pointer.
 */
export function RingCarousel({ items, label, onSelect, intro = true }: { items: RingItem[]; label: string; onSelect: (id: string) => void; /** Give the ring a short spin when it appears, so it is clear that it turns. */ intro?: boolean }) {
  const n = items.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef<Motion>({ p: 0, v: 0 });
  const raf = useRef(0);
  const lastFrame = useRef(0);
  const drag = useRef<{ id: number; startX: number; startP: number; lastX: number; lastT: number; v: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const activeRef = useRef(0);
  const layoutRef = useRef<Layout>(layoutFor(800, n));
  const tickRef = useRef<(now: number) => void>(() => undefined);
  const reduced = useRef(false);

  const [layout, setLayout] = useState<Layout>(() => layoutFor(800, n));
  const [active, setActive] = useState(0);
  const [settled, setSettled] = useState(false);
  const [dragging, setDragging] = useState(false);

  const paint = useCallback(() => {
    const { geo } = layoutRef.current;
    const p = motion.current.p;
    for (let i = 0; i < n; i++) {
      const el = slots.current[i];
      if (!el) continue;
      const t = tileTransform(i, p, n, geo);
      el.style.transform = `perspective(900px) translate3d(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px, 0) rotateY(${t.rotateY.toFixed(1)}deg) scale(${t.scale.toFixed(3)})`;
      el.style.opacity = t.opacity.toFixed(3);
      el.style.zIndex = String(t.zIndex);
    }
    const near = nearestIndex(p, n);
    if (near !== activeRef.current) { activeRef.current = near; setActive(near); }
  }, [n]);

  const stop = useCallback(() => { cancelAnimationFrame(raf.current); raf.current = 0; }, []);

  const tick = useCallback((now: number) => {
    const dt = lastFrame.current ? (now - lastFrame.current) / 1000 : 1 / 60;
    lastFrame.current = now;
    const next = stepMotion(motion.current, dt);
    motion.current = { p: next.p, v: next.v, target: next.target };
    paint();
    if (next.settled) { raf.current = 0; setSettled(true); return; }
    raf.current = requestAnimationFrame((t) => tickRef.current(t));
  }, [paint]);

  const run = useCallback(() => {
    setSettled(false);
    if (raf.current) return;
    lastFrame.current = 0;
    raf.current = requestAnimationFrame((t) => tickRef.current(t));
  }, []);

  useEffect(() => { tickRef.current = tick; }, [tick]);

  /** Sends the ring to a tile: smoothly, or at once when motion is reduced. */
  const goTo = useCallback((index: number) => {
    if (n === 0) return;
    const m = motionTo(motion.current, index, n);
    if (reduced.current) {
      motion.current = { p: m.target ?? m.p, v: 0, target: m.target };
      paint();
      setSettled(true);
      return;
    }
    motion.current = m;
    run();
  }, [n, paint, run]);

  /** Turns the ring by whole tiles, from where it is heading (so quick repeated taps keep stepping). */
  const rotateBy = useCallback((steps: number) => {
    const from = Math.round(motion.current.target ?? motion.current.p);
    goTo((((from + steps) % n) + n) % n);
  }, [goTo, n]);

  // First paint, size changes, and a short intro spin so it is obvious the ring turns.
  useLayoutEffect(() => {
    reduced.current = prefersReducedMotion();
    const stage = stageRef.current;
    if (!stage) return;
    const apply = (w: number) => {
      const l = layoutFor(w || 800, n);
      layoutRef.current = l;
      setLayout(l);
      paint();
    };
    apply(stage.clientWidth);
    const ro = new ResizeObserver(() => apply(stage.clientWidth));
    ro.observe(stage);
    if (!reduced.current && n >= 3 && intro) {
      motion.current = { p: 0, v: Math.min(MAX_SPEED, 6) };
      run();
    } else {
      setSettled(true);
    }
    return () => { ro.disconnect(); stop(); };
  }, [n, paint, run, stop, intro]);

  // Keep keyboard focus on the tile that is now in the centre, but only if focus was already in the ring.
  const firstActive = useRef(true);
  useEffect(() => {
    if (firstActive.current) { firstActive.current = false; return; }
    const stage = stageRef.current;
    if (stage?.contains(document.activeElement)) slots.current[active]?.querySelector("button")?.focus({ preventScroll: true });
  }, [active]);

  function onPointerDown(e: React.PointerEvent) {
    if (n < 3 || (e.pointerType === "mouse" && e.button !== 0)) return;
    stop(); // grabbing the ring stops it
    motion.current = { p: motion.current.p, v: 0 };
    drag.current = { id: e.pointerId, startX: e.clientX, startP: motion.current.p, lastX: e.clientX, lastT: performance.now(), v: 0, moved: false };
    setSettled(false);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      stageRef.current?.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT) / 1000;
    const instant = -(e.clientX - d.lastX) / layoutRef.current.pxPerTile / dt;
    d.v = 0.6 * instant + 0.4 * d.v; // smoothed, so one jittery sample cannot throw the ring
    d.lastX = e.clientX;
    d.lastT = now;
    motion.current = { p: d.startP - dx / layoutRef.current.pxPerTile, v: 0 };
    paint();
  }

  function release(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (d.moved) {
      suppressClick.current = true; // the click that follows a drag must not open a tile
      setTimeout(() => { suppressClick.current = false; }, 0);
      const idle = performance.now() - d.lastT > 120; // held still before letting go: no flick
      if (reduced.current) goTo(nearestIndex(motion.current.p, n));
      else { motion.current = { p: motion.current.p, v: idle ? 0 : clampSpeed(d.v) }; run(); }
    } else {
      motion.current = { p: motion.current.p, v: 0 };
      run(); // grabbed without dragging: let it settle onto the nearest tile
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (n < 3) return;
    if (e.key === "ArrowRight") { e.preventDefault(); rotateBy(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); rotateBy(-1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(n - 1); }
  }

  // A click that ends a drag must not open anything. Link tiles open by themselves; the rest tell the parent.
  const clicked = (e: React.MouseEvent<HTMLElement>, it: RingItem) => {
    if (suppressClick.current) { e.preventDefault(); return; }
    if (!it.href) onSelect(it.id);
  };

  // Fewer than three tiles do not make a ring: show them side by side.
  if (n < 3) {
    return (
      <div role="group" aria-label={label} className="flex flex-wrap justify-center gap-4 py-4">
        {items.map((it) => <div key={it.id} className="h-36 w-48"><RingTile item={it} active onClick={(e) => clicked(e, it)} /></div>)}
      </div>
    );
  }

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label} onKeyDown={onKeyDown}>
      <div
        ref={stageRef}
        className="ring-stage relative overflow-hidden"
        style={{ height: layout.height }}
        data-settled={settled}
        data-dragging={dragging}
        data-active={items[active]?.id}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {items.map((it, i) => (
          <div
            key={it.id}
            ref={(el) => { slots.current[i] = el; }}
            className="absolute left-1/2 top-1/2"
            style={{ width: layout.tileW, height: layout.tileH, marginLeft: -layout.tileW / 2, marginTop: -layout.tileH / 2 + layout.geo.rise / 2, willChange: "transform" }}
          >
            <div className={`h-full w-full ${i === active && settled && !dragging ? "ring-bob" : ""}`}>
              <RingTile item={it} active={i === active} tabIndex={i === active ? 0 : -1} onClick={(e) => clicked(e, it)} />
            </div>
          </div>
        ))}
      </div>

      <div className="ring-controls mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" onClick={() => rotateBy(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" aria-hidden /></Button>
        {items[active]?.href ? (
          <a href={items[active].href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={`${buttonClass("primary", "sm")} max-w-[16rem]`}>
            <span className="truncate">Open {items[active].title}</span>
            <span className="sr-only">(opens the official site in a new tab)</span>
          </a>
        ) : (
          <Button size="sm" variant="primary" onClick={() => onSelect(items[active].id)} className="max-w-[16rem]">
            <span className="truncate">Open {items[active]?.title}</span>
          </Button>
        )}
        <Button size="sm" onClick={() => rotateBy(1)} aria-label="Next"><ChevronRight className="h-4 w-4" aria-hidden /></Button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{settled ? `${items[active]?.title}, ${active + 1} of ${n}` : ""}</p>
      <p className="mt-1 text-center text-xs text-slate-400">Drag or flick to spin. Arrow keys also turn it.</p>
    </div>
  );
}
