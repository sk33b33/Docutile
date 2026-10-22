"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ClipboardList, Pencil, Plus, Save } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { PackMetaForm } from "@/components/packs/PackMetaForm";
import { CompletenessSummary } from "@/components/packs/CompletenessSummary";
import { PackStatusBadge } from "@/components/packs/PackStatusBadge";
import { usePackEditor } from "@/components/packs/usePackEditor";
import { SlotTile } from "@/components/documents/SlotTile";
import { SourceNote } from "@/components/templates/SourceNote";
import { SlotEditorDialog, type SlotDraft } from "@/components/templates/SlotEditorDialog";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { EmptyState, PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_ACCEPTED_TYPES } from "@/lib/constants";
import { downloadBlob, previewBlob } from "@/lib/download";
import { formatDate } from "@/lib/format";
import { computeCompleteness } from "@/lib/validation/pack";
import type { AttachedFile, DocumentSlot } from "@/types";

type SlotDialog = { mode: "add" } | { mode: "edit"; slot: DocumentSlot } | null;

export default function PackBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { repo, settings } = useApp();
  const ed = usePackEditor(id);
  const { notify } = useToast();
  const pack = ed.pack;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [replacePrompt, setReplacePrompt] = useState<{ slot: DocumentSlot; file: File; fileId: string } | null>(null);
  const [removeFilePrompt, setRemoveFilePrompt] = useState<{ slot: DocumentSlot; file: AttachedFile } | null>(null);
  const [removeSlotPrompt, setRemoveSlotPrompt] = useState<DocumentSlot | null>(null);
  const [slotDialog, setSlotDialog] = useState<SlotDialog>(null);
  const [metaOpen, setMetaOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!pack) {
    return (
      <EmptyState title="Pack not found" action={<LinkButton href="/">Back to dashboard</LinkButton>}>
        This draft does not exist in this browser. It may have been deleted, or browser data may have been cleared.
      </EmptyState>
    );
  }

  const c = computeCompleteness(pack.slots);
  const fail = (e: unknown, fallback: string) => notify("error", e instanceof Error ? e.message : fallback);
  const setError = (slotId: string, msg: string | null) =>
    setErrors((p) => { const n = { ...p }; if (msg) n[slotId] = msg; else delete n[slotId]; return n; });

  async function attach(slot: DocumentSlot, file: File, replaceFileId?: string) {
    try {
      const r = await ed.attachFile(slot.id, file, replaceFileId);
      if (r.error) { setError(slot.id, r.error); return false; }
      setError(slot.id, null);
      r.warnings.forEach((w) => notify("info", w));
      notify("success", `${replaceFileId ? "Replaced with" : "Attached"} "${file.name}" in ${slot.name}.`);
      return true;
    } catch (e) {
      setError(slot.id, e instanceof Error ? e.message : "The file could not be saved.");
      return false;
    }
  }

  async function onFiles(slot: DocumentSlot, files: File[], replaceFileId?: string) {
    const current = pack!.slots.find((s) => s.id === slot.id) ?? slot;
    if (!current.allowMultiple && files.length > 1) {
      setError(slot.id, `${current.name} accepts a single file, but ${files.length} were provided. Nothing was attached.`);
      return;
    }
    if (!current.allowMultiple && current.files.length > 0) {
      // Never overwrite silently: ask first (explicit Replace button already names its target).
      const target = replaceFileId ?? current.files[0].id;
      if (replaceFileId) await attach(current, files[0], target);
      else setReplacePrompt({ slot: current, file: files[0], fileId: target });
      return;
    }
    for (const f of files) await attach(current, f, replaceFileId);
  }

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = pack!.slots.findIndex((s) => s.id === e.active.id);
    const to = pack!.slots.findIndex((s) => s.id === e.over!.id);
    try { await ed.moveSlot(from, to); } catch (err) { fail(err, "The new order could not be saved."); }
  }

  async function open(file: AttachedFile, mode: "preview" | "download") {
    try {
      const blob = await repo.getBlob(file.blobKey);
      if (!blob) { notify("error", `"${file.displayName}" is missing from this browser's storage. Re-attach it.`); return; }
      if (mode === "preview") previewBlob(blob); else downloadBlob(blob, file.originalName);
    } catch (err) { fail(err, "The file could not be read."); }
  }

  const slotInitial = (s?: DocumentSlot): SlotDraft => ({
    name: s?.name ?? "", description: s?.description ?? "", required: s?.required ?? true,
    acceptedTypes: s?.acceptedTypes ?? DEFAULT_ACCEPTED_TYPES, maxFileSizeBytes: s?.maxFileSizeBytes ?? settings.defaultMaxFileSizeBytes,
    allowMultiple: s?.allowMultiple ?? false,
  });

  function validateSlotEdit(slot: DocumentSlot | undefined, d: SlotDraft): string | null {
    if (!slot) return null;
    const bad = slot.files.find((f) => !d.acceptedTypes.some((t) => f.originalName.toLowerCase().endsWith(`.${t}`)) || f.sizeBytes > d.maxFileSizeBytes);
    if (bad) return `"${bad.displayName}" is already attached and would no longer be allowed. Remove it first, or keep its type and size allowed.`;
    if (!d.allowMultiple && slot.files.length > 1) return "This slot holds several files. Remove the extras before switching to a single file.";
    return null;
  }

  return (
    <>
      <PageHeader
        title={pack.name}
        description={`${pack.organisationName}${pack.referenceNumber ? ` · Ref ${pack.referenceNumber}` : ""}${pack.dueDate ? ` · Due ${formatDate(pack.dueDate)}` : ""}${pack.submissionType ? ` · ${pack.submissionType}` : ""}`}
        actions={
          <>
            <PackStatusBadge status={pack.status} />
            <Button onClick={() => setMetaOpen(true)}><Pencil className="h-4 w-4" aria-hidden /> Edit details</Button>
            <Button onClick={async () => { try { await ed.saveDraft(); notify("success", "Draft saved in this browser."); } catch (e) { fail(e, "Draft could not be saved."); } }}>
              <Save className="h-4 w-4" aria-hidden /> Save draft
            </Button>
            <LinkButton href={`/packs/${pack.id}/review`} variant="primary"><ClipboardList className="h-4 w-4" aria-hidden /> Review &amp; export</LinkButton>
          </>
        }
      />
      <p className="mb-4 text-xs text-slate-600">Changes are saved automatically to this browser (IndexedDB). They are not shared and are lost if browser data is cleared.</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Document tiles">
          {pack.slots.length === 0 ? (
            <EmptyState title="No document slots" action={<Button variant="primary" onClick={() => setSlotDialog({ mode: "add" })}><Plus className="h-4 w-4" aria-hidden /> Add document slot</Button>}>
              This is a custom checklist. Add the documents this pack needs, then mark each as required or optional.
            </EmptyState>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pack.slots.map((s) => s.id)} strategy={rectSortingStrategy}>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {pack.slots.map((slot, i) => (
                    <SlotTile
                      key={slot.id} slot={slot} index={i} total={pack.slots.length} error={errors[slot.id]}
                      onFiles={onFiles}
                      onRemoveFile={(s, f) => setRemoveFilePrompt({ slot: s, file: f })}
                      onRenameFile={(s, f, name) => ed.renameFile(s.id, f.id, name).catch((e) => fail(e, "Could not rename."))}
                      onMoveFile={(s, from, to) => ed.moveFile(s.id, from, to).catch((e) => fail(e, "Could not reorder."))}
                      onPreview={(f) => open(f, "preview")}
                      onDownload={(f) => open(f, "download")}
                      onEditSlot={(s) => setSlotDialog({ mode: "edit", slot: s })}
                      onRemoveSlot={setRemoveSlotPrompt}
                      onMoveSlot={(from, to) => ed.moveSlot(from, to).catch((e) => fail(e, "Could not reorder."))}
                      onDismissError={(sid) => setError(sid, null)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          {pack.slots.length > 0 && (
            <div className="mt-4"><Button onClick={() => setSlotDialog({ mode: "add" })}><Plus className="h-4 w-4" aria-hidden /> Add document slot</Button></div>
          )}
        </section>

        <aside aria-label="Pack summary" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <CompletenessSummary c={c} />
          <section className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600">
            <h2 className="text-sm font-semibold text-slate-900">Pack order</h2>
            <p className="mt-1">Documents appear in the exported pack in tile order (left to right, top to bottom). Drag the grip handle, or use the arrow buttons, to reorder.</p>
            <p className="mt-2">Template: {pack.templateName}</p>
            {pack.templateSource && <SourceNote source={pack.templateSource} className="mt-2" />}
          </section>
          {pack.notes && <NotesCard notes={pack.notes} />}
        </aside>
      </div>

      <Dialog open={metaOpen} title="Edit pack details" onClose={() => setMetaOpen(false)}>
        {metaOpen && (
          <PackMetaForm
            idPrefix="edit"
            initial={{ name: pack.name, organisationName: pack.organisationName, submissionType: pack.submissionType, referenceNumber: pack.referenceNumber, dueDate: pack.dueDate, notes: pack.notes }}
            submitLabel="Save details"
            onCancel={() => setMetaOpen(false)}
            onSubmit={async (m) => { try { await ed.updateMeta(m); setMetaOpen(false); notify("success", "Pack details updated."); } catch (e) { fail(e, "Details could not be saved."); } }}
          />
        )}
      </Dialog>

      <SlotEditorDialog
        open={!!slotDialog}
        title={slotDialog?.mode === "edit" ? "Edit document slot" : "Add document slot"}
        initial={slotInitial(slotDialog?.mode === "edit" ? slotDialog.slot : undefined)}
        validate={(d) => validateSlotEdit(slotDialog?.mode === "edit" ? slotDialog.slot : undefined, d)}
        onClose={() => setSlotDialog(null)}
        onSave={async (d) => {
          const dlg = slotDialog;
          try {
            if (dlg?.mode === "edit") await ed.updateSlot(dlg.slot.id, d); else await ed.addSlot(d);
            setSlotDialog(null);
            notify("success", dlg?.mode === "edit" ? "Slot updated." : "Slot added.");
          } catch (e) { fail(e, "The slot could not be saved."); }
        }}
      />

      <ConfirmDialog
        open={!!replacePrompt} title="Replace existing file?" confirmLabel="Replace file"
        message={<>“{replacePrompt?.slot.name}” already has “{replacePrompt?.slot.files[0]?.displayName}”. Replace it with “{replacePrompt?.file.name}”? The current file will be removed from this pack. This slot holds a single file, so both cannot be kept.</>}
        onCancel={() => setReplacePrompt(null)}
        onConfirm={async () => { const p = replacePrompt; setReplacePrompt(null); if (p) await attach(p.slot, p.file, p.fileId); }}
      />
      <ConfirmDialog
        open={!!removeFilePrompt} danger title="Remove this file?" confirmLabel="Remove file"
        message={<>“{removeFilePrompt?.file.displayName}” will be deleted from this pack and from browser storage. Your original file on your computer is not affected.</>}
        onCancel={() => setRemoveFilePrompt(null)}
        onConfirm={async () => {
          const p = removeFilePrompt; setRemoveFilePrompt(null);
          if (!p) return;
          try { await ed.removeFile(p.slot.id, p.file.id); notify("success", `Removed "${p.file.displayName}".`); } catch (e) { fail(e, "The file could not be removed."); }
        }}
      />
      <ConfirmDialog
        open={!!removeSlotPrompt} danger title="Delete this document slot?" confirmLabel="Delete slot"
        message={<>“{removeSlotPrompt?.name}” will be removed from this pack{removeSlotPrompt && removeSlotPrompt.files.length > 0 ? `, along with its ${removeSlotPrompt.files.length} attached file(s)` : ""}. This cannot be undone.</>}
        onCancel={() => setRemoveSlotPrompt(null)}
        onConfirm={async () => {
          const s = removeSlotPrompt; setRemoveSlotPrompt(null);
          if (!s) return;
          try { await ed.removeSlot(s.id); notify("success", `Deleted slot "${s.name}".`); } catch (e) { fail(e, "The slot could not be deleted."); }
        }}
      />
    </>
  );
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
      <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{notes}</p>
    </section>
  );
}

