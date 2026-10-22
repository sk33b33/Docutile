"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextArea, TextInput, describedBy } from "@/components/ui/Field";
import { DEFAULT_ACCEPTED_TYPES, MB } from "@/lib/constants";

export interface SlotDraft {
  name: string;
  description: string;
  required: boolean;
  acceptedTypes: string[];
  maxFileSizeBytes: number;
  allowMultiple: boolean;
}

interface Props {
  open: boolean;
  title: string;
  initial: SlotDraft;
  /** Extra validation (e.g. existing files vs. new rules). Return an error message or null. */
  validate?: (draft: SlotDraft) => string | null;
  onSave: (draft: SlotDraft) => void;
  onClose: () => void;
}

/** The form is remounted via `key` each time the dialog opens, so state starts from `initial`. */
function SlotForm({ initial, validate, onSave, onClose }: Omit<Props, "open" | "title">) {
  const [draft, setDraft] = useState<SlotDraft>(initial);
  const [mb, setMb] = useState(String(Math.round((initial.maxFileSizeBytes / MB) * 10) / 10));
  const [errors, setErrors] = useState<{ name?: string; types?: string; size?: string; other?: string }>({});

  function save(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    const size = Number(mb);
    if (!draft.name.trim()) next.name = "Document name is required.";
    if (draft.acceptedTypes.length === 0) next.types = "Choose at least one accepted file type.";
    if (!Number.isFinite(size) || size <= 0 || size > 500) next.size = "Enter a size limit between 0.1 and 500 MB.";
    const final: SlotDraft = { ...draft, name: draft.name.trim(), description: draft.description.trim(), maxFileSizeBytes: Math.round(size * MB) };
    if (!next.name && !next.types && !next.size) next.other = validate?.(final) ?? undefined;
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSave(final);
  }

  const toggleType = (t: string) =>
    setDraft((d) => ({ ...d, acceptedTypes: d.acceptedTypes.includes(t) ? d.acceptedTypes.filter((x) => x !== t) : [...d.acceptedTypes, t] }));

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <Field label="Document name" htmlFor="slot-name" required error={errors.name}>
        <TextInput id="slot-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={describedBy("slot-name", errors.name)} />
      </Field>
      <Field label="Help text" htmlFor="slot-desc">
        <TextArea id="slot-desc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} /> Required</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.allowMultiple} onChange={(e) => setDraft({ ...draft, allowMultiple: e.target.checked })} /> Allow multiple files</label>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-100">Accepted file types</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {DEFAULT_ACCEPTED_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1.5 uppercase"><input type="checkbox" checked={draft.acceptedTypes.includes(t)} onChange={() => toggleType(t)} /> {t}</label>
          ))}
        </div>
        {errors.types && <p className="mt-1 text-xs font-medium text-red-300">{errors.types}</p>}
        <p className="mt-1 text-xs text-slate-300">Only PDF, PNG and JPG files can be combined into the exported PDF.</p>
      </fieldset>
      <Field label="Maximum file size (MB)" htmlFor="slot-size" error={errors.size}>
        <TextInput id="slot-size" inputMode="decimal" value={mb} onChange={(e) => setMb(e.target.value)} aria-invalid={!!errors.size} aria-describedby={describedBy("slot-size", errors.size)} className="max-w-32" />
      </Field>
      {errors.other && <p role="alert" className="text-sm font-medium text-red-300">{errors.other}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save</Button>
      </div>
    </form>
  );
}

export function SlotEditorDialog({ open, title, ...rest }: Props) {
  return (
    <Dialog open={open} title={title} onClose={rest.onClose}>
      {open && <SlotForm {...rest} />}
    </Dialog>
  );
}
