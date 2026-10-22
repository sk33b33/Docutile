"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput, describedBy } from "@/components/ui/Field";
import { SUBMISSION_TYPES } from "@/lib/constants";
import { validatePackMeta } from "@/lib/validation/pack";
import type { PackMetaInput } from "@/lib/packs";

interface Props {
  initial: PackMetaInput;
  submitLabel: string;
  onSubmit: (meta: PackMetaInput) => void | Promise<void>;
  onCancel?: () => void;
  children?: React.ReactNode;
  idPrefix?: string;
}

export function PackMetaForm({ initial, submitLabel, onSubmit, onCancel, children, idPrefix = "pack" }: Props) {
  const [meta, setMeta] = useState<PackMetaInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof PackMetaInput) => (e: { target: { value: string } }) => setMeta((m) => ({ ...m, [k]: e.target.value }));
  const id = (k: string) => `${idPrefix}-${k}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const issues = validatePackMeta(meta);
    setErrors(Object.fromEntries(issues.map((i) => [i.field, i.message])));
    if (issues.length) {
      document.getElementById(id(issues[0].field))?.focus();
      return;
    }
    setBusy(true);
    try { await onSubmit(meta); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pack name" htmlFor={id("name")} required error={errors.name}>
          <TextInput id={id("name")} value={meta.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={describedBy(id("name"), errors.name)} autoComplete="off" />
        </Field>
        <Field label="Client / organisation" htmlFor={id("organisationName")} required error={errors.organisationName}>
          <TextInput id={id("organisationName")} value={meta.organisationName} onChange={set("organisationName")} aria-invalid={!!errors.organisationName} aria-describedby={describedBy(id("organisationName"), errors.organisationName)} autoComplete="off" />
        </Field>
        <Field label="Submission type" htmlFor={id("submissionType")}>
          <Select id={id("submissionType")} value={meta.submissionType} onChange={set("submissionType")}>
            <option value="">Not specified</option>
            {SUBMISSION_TYPES.map((t) => <option key={t}>{t}</option>)}
            {meta.submissionType && !SUBMISSION_TYPES.includes(meta.submissionType) && <option>{meta.submissionType}</option>}
          </Select>
        </Field>
        <Field label="Reference number" htmlFor={id("referenceNumber")}>
          <TextInput id={id("referenceNumber")} value={meta.referenceNumber} onChange={set("referenceNumber")} autoComplete="off" />
        </Field>
        <Field label="Due date" htmlFor={id("dueDate")}>
          <TextInput id={id("dueDate")} type="date" value={meta.dueDate} onChange={set("dueDate")} />
        </Field>
      </div>
      <Field label="Notes" htmlFor={id("notes")}>
        <TextArea id={id("notes")} rows={3} value={meta.notes} onChange={set("notes")} />
      </Field>
      {children}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
