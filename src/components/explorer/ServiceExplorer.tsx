"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutGrid, Orbit, Rocket } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { PackMetaForm } from "@/components/packs/PackMetaForm";
import { NextSteps } from "@/components/packs/NextSteps";
import { SourceNote } from "@/components/templates/SourceNote";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { glowForCategory, glowForSub } from "@/lib/carousel/glow";
import { buildExplorerTree, hasSubLevel, type ExplorerCategory, type ExplorerSub } from "@/lib/carousel/tree";
import { formLabel } from "@/lib/format";
import { createPack, type PackMetaInput } from "@/lib/packs";
import { CHECKLIST_LABEL } from "@/lib/templates/categories";
import type { Template } from "@/types";
import { DocumentDetail } from "./DocumentDetail";
import { RingCarousel } from "./RingCarousel";
import { RingTile, type RingItem } from "./RingTile";

type View = "carousel" | "list";
const VIEW_KEY = "docutile:service-view";
interface Nav { cat?: string; sub?: string; tpl?: string; doc?: string }

const VIEW_EVENT = "docutile:service-view";

function readView(): View {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "carousel" || saved === "list") return saved;
  } catch { /* storage may be blocked: use the default */ }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "list" : "carousel";
}

const subscribeView = (cb: () => void) => {
  window.addEventListener(VIEW_EVENT, cb);
  return () => window.removeEventListener(VIEW_EVENT, cb);
};

function saveView(v: View) {
  try { localStorage.setItem(VIEW_KEY, v); } catch { /* a remembered choice is only a convenience */ }
  window.dispatchEvent(new Event(VIEW_EVENT));
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * "Start a pack": choose a category, then a subcategory, then a service, then see its document tiles. Each step
 * is a ring of neon tiles (or a list). Nothing is saved until the user starts a pack.
 */
export function ServiceExplorer() {
  const { templates, savePack, log } = useApp();
  const { notify } = useToast();
  const router = useRouter();
  // Server render and first paint use the carousel; the saved choice (or reduced motion) applies straight after.
  const view = useSyncExternalStore(subscribeView, readView, () => "carousel" as View);
  const [nav, setNav] = useState<Nav>({});
  const [starting, setStarting] = useState<Template | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const chooseView = saveView;

  const tree = useMemo(() => buildExplorerTree(templates), [templates]);
  const catIndex = tree.findIndex((c) => c.id === nav.cat);
  const cat: ExplorerCategory | undefined = tree[catIndex];
  const catGlow = cat ? glowForCategory(cat.title, catIndex) : "";
  const subSteps = cat ? hasSubLevel(cat) : false;
  const subIndex = cat ? cat.subs.findIndex((s) => s.id === (subSteps ? nav.sub : cat.subs[0]?.id)) : -1;
  const sub: ExplorerSub | undefined = cat?.subs[subIndex];
  const subGlow = sub && cat ? (subSteps ? glowForSub(catGlow, subIndex) : catGlow) : "";
  const template = sub?.templates.find((t) => t.id === nav.tpl);
  const slot = template?.slots.find((s) => s.id === nav.doc);

  const level = slot ? 4 : template ? 3 : sub ? 2 : cat ? 1 : 0;
  const title = ["Choose a category", `Choose a group in ${cat?.title}`, `Choose a service${sub?.title ? ` in ${sub.title}` : ""}`, template?.name ?? "", slot?.name ?? ""][level];

  // After going deeper or back, put keyboard focus on the new heading so nobody is left on a tile that is gone.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [level]);

  function back() {
    setNav((n) => {
      if (n.doc) return { ...n, doc: undefined };
      if (n.tpl) return { ...n, tpl: undefined };
      if (subSteps && n.sub) return { ...n, sub: undefined };
      return {};
    });
  }

  const items: RingItem[] = useMemo(() => {
    if (level === 0) {
      return tree.map((c, i) => ({
        id: c.id, title: c.title, kicker: "Category", subtitle: plural(c.count, "service"),
        badge: c.subs.length > 1 ? plural(c.subs.length, "group") : undefined, glow: glowForCategory(c.title, i),
      }));
    }
    if (level === 1 && cat) {
      return cat.subs.map((s, i) => ({ id: s.id, title: s.title ?? cat.title, kicker: cat.title, subtitle: plural(s.templates.length, "service"), glow: glowForSub(catGlow, i) }));
    }
    if (level === 2 && sub) {
      return sub.templates.map((t) => ({
        id: t.id, title: t.name, kicker: sub.title ?? cat?.title,
        subtitle: `${t.slots.filter((s) => s.required).length} required, ${t.slots.filter((s) => !s.required).length} optional`,
        badge: t.checklist ? CHECKLIST_LABEL[t.checklist].label : undefined, glow: subGlow,
      }));
    }
    if (level === 3 && template) {
      return template.slots.map((s) => ({
        id: s.id, title: s.name, kicker: s.formRef ? formLabel(s.formRef) : "Document", subtitle: s.required ? "Required" : "Optional",
        glow: s.required ? subGlow : "148 163 184",
      }));
    }
    return [];
  }, [level, tree, cat, catGlow, sub, subGlow, template]);

  function pick(id: string) {
    if (level === 0) setNav({ cat: id, sub: undefined });
    else if (level === 1) setNav((n) => ({ ...n, sub: id }));
    else if (level === 2) setNav((n) => ({ ...n, tpl: id }));
    else if (level === 3) setNav((n) => ({ ...n, doc: id }));
  }

  async function startPack(meta: PackMetaInput) {
    const chosen = starting;
    if (!chosen) return;
    try {
      const saved = await savePack(createPack(meta, chosen));
      await log("pack_created", `Created pack "${saved.name}" from ${saved.templateName}`, saved.id);
      router.push(`/packs/${saved.id}`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "The pack could not be saved.");
    }
  }

  const crumbs: { label: string; go: () => void }[] = [{ label: "Services", go: () => setNav({}) }];
  if (cat) crumbs.push({ label: cat.title, go: () => setNav({ cat: cat.id }) });
  if (cat && subSteps && sub) crumbs.push({ label: sub.title ?? "", go: () => setNav({ cat: cat.id, sub: sub.id }) });
  if (template) crumbs.push({ label: template.name, go: () => setNav((n) => ({ ...n, doc: undefined })) });
  if (slot) crumbs.push({ label: slot.name, go: () => undefined });

  return (
    <section aria-labelledby="explorer-title" className="glass mb-6 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="explorer-title" className="text-base font-semibold">Start a pack</h2>
        <div role="group" aria-label="View" className="ml-auto flex gap-1">
          <Button size="sm" variant={view === "carousel" ? "primary" : "secondary"} aria-pressed={view === "carousel"} onClick={() => chooseView("carousel")}>
            <Orbit className="h-4 w-4" aria-hidden /> Carousel
          </Button>
          <Button size="sm" variant={view === "list" ? "primary" : "secondary"} aria-pressed={view === "list"} onClick={() => chooseView("list")}>
            <LayoutGrid className="h-4 w-4" aria-hidden /> List
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {level > 0 && <Button size="sm" onClick={back}><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button>}
        <nav aria-label="Breadcrumb" className={`min-w-0 text-xs text-slate-300 ${level === 0 ? "hidden" : ""}`}>
          <ol className="flex flex-wrap items-center gap-1">
            {crumbs.map((c, i) => (
              <li key={`${i}-${c.label}`} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden>/</span>}
                {i === crumbs.length - 1 ? <span aria-current="page" className="font-medium text-slate-100">{c.label}</span>
                  : <button type="button" onClick={c.go} className="underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{c.label}</button>}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <h3 ref={heading} tabIndex={-1} className="mt-3 text-lg font-semibold outline-none">{title}</h3>
      {level === 0 && <p className="text-xs text-slate-300">Pick a category to see its services. Nothing is saved until you start a pack.</p>}
      {level === 1 && cat?.note && <p className="text-xs text-slate-300">{cat.note}</p>}

      {level < 4 && items.length > 0 && (
        view === "carousel"
          ? <RingCarousel key={`${level}-${nav.cat}-${nav.sub}-${nav.tpl}`} items={items} label={title} onSelect={pick} />
          : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => <li key={it.id} className="h-36"><RingTile item={it} onClick={() => pick(it.id)} /></li>)}
            </ul>
          )
      )}

      {level === 3 && template && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
          <p className="text-sm text-slate-200">{template.description}</p>
          {template.checklistNote && <p className="text-xs text-amber-200">{template.checklistNote}</p>}
          {template.source && <SourceNote source={template.source} />}
          <NextSteps steps={template.nextSteps} />
          <Button variant="primary" onClick={() => setStarting(template)}><Rocket className="h-4 w-4" aria-hidden /> Start a pack</Button>
        </div>
      )}

      {level === 4 && template && slot && (
        <div className="mt-3"><DocumentDetail slot={slot} template={template} glow={subGlow} onBack={back} onStart={() => setStarting(template)} /></div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Prefer a form? <Link href="/packs/new" className="text-cyan-200 underline">Use the full New pack form</Link>, which also has a blank custom checklist.
      </p>

      <Dialog open={!!starting} title={`Start a pack: ${starting?.name ?? ""}`} onClose={() => setStarting(null)}>
        {starting && (
          <PackMetaForm
            idPrefix="start"
            initial={{ name: starting.name, organisationName: "", submissionType: "", referenceNumber: "", dueDate: "", notes: "" }}
            submitLabel="Create pack"
            onSubmit={startPack}
            onCancel={() => setStarting(null)}
          />
        )}
      </Dialog>
    </section>
  );
}
