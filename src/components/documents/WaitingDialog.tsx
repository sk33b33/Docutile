"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextInput, describedBy } from "@/components/ui/Field";
import type { DocumentSlot } from "@/types";

interface Props {
  slot: DocumentSlot | null;
  onSave: (note: string, expectedBy: string) => void;
  onClose: () => void;
}

function Form({ slot, onSave, onClose }: { slot: DocumentSlot; onSave: Props["onSave"]; onClose: () => void }) {
  const [note, setNote] = useState(slot.waiting?.note ?? "");
  const [expectedBy, setExpectedBy] = useState(slot.waiting?.expectedBy ?? "");
  const [error, setError] = useState<string>();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!note.trim()) { setError("Say what you are waiting for, for example “applied at Home Affairs on 3 Nov”."); return; }
        onSave(note.trim(), expectedBy);
      }}
      className="space-y-4"
    >
      <p className="text-slate-300">A waiting note is a reminder only. <strong>{slot.name}</strong> still counts as missing, and the pack cannot be marked ready, until you add the file.</p>
      <Field label="What are you waiting for?" htmlFor="waiting-note" required error={error}>
        <TextInput id="waiting-note" value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy("waiting-note", error)} autoComplete="off" />
      </Field>
      <Field label="Expected by (optional)" htmlFor="waiting-date">
        <TextInput id="waiting-date" type="date" value={expectedBy} onChange={(e) => setExpectedBy(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save note</Button>
      </div>
    </form>
  );
}

export function WaitingDialog({ slot, onSave, onClose }: Props) {
  return (
    <Dialog open={!!slot} title={slot?.waiting ? "Edit waiting note" : "Mark as waiting"} onClose={onClose}>
      {slot && <Form key={slot.id} slot={slot} onSave={onSave} onClose={onClose} />}
    </Dialog>
  );
}
