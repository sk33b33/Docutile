"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextInput, describedBy } from "@/components/ui/Field";

const MIN_PASSWORD = 8;

function ExportForm({ onExport, onClose }: { onExport: (password: string | null) => Promise<void>; onClose: () => void }) {
  const [protect, setProtect] = useState(true);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (protect) {
      if (pw.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
      if (pw !== pw2) return setError("The two passwords do not match.");
    }
    setError(undefined);
    setBusy(true);
    try {
      await onExport(protect ? pw : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The backup could not be created.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium text-slate-100">Protection</legend>
        <label className="flex items-start gap-2"><input type="radio" name="protect" checked={protect} onChange={() => setProtect(true)} className="mt-1" /><span><strong>Encrypt with a password</strong> (recommended). The documents inside cannot be read without it.</span></label>
        <label className="flex items-start gap-2"><input type="radio" name="protect" checked={!protect} onChange={() => setProtect(false)} className="mt-1" /><span><strong>No password.</strong> Anyone who gets the file can read every document in it.</span></label>
      </fieldset>
      {protect && (
        <>
          <Field label="Password" htmlFor="bk-pw" required error={error} hint={`At least ${MIN_PASSWORD} characters. If you forget it, the backup cannot be recovered: Docutile cannot reset it.`}>
            <TextInput id="bk-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy("bk-pw", error, "hint")} />
          </Field>
          <Field label="Repeat password" htmlFor="bk-pw2" required>
            <TextInput id="bk-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </Field>
        </>
      )}
      {!protect && error && <p role="alert" className="text-sm font-medium text-red-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Creating…" : "Download backup"}</Button>
      </div>
    </form>
  );
}

export function BackupExportDialog({ open, onExport, onClose }: { open: boolean; onExport: (password: string | null) => Promise<void>; onClose: () => void }) {
  return (
    <Dialog open={open} title="Export backup" onClose={onClose}>
      {open && <ExportForm onExport={onExport} onClose={onClose} />}
    </Dialog>
  );
}

function PasswordForm({ fileName, onSubmit, onClose }: { fileName: string; onSubmit: (password: string) => Promise<void>; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pw) return setError("Enter the backup's password.");
        setBusy(true);
        setError(undefined);
        try {
          await onSubmit(pw);
        } catch (err) {
          setError(err instanceof Error ? err.message : "The backup could not be opened.");
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      <p className="text-slate-300">“{fileName}” is password-protected.</p>
      <Field label="Password" htmlFor="imp-pw" required error={error}>
        <TextInput id="imp-pw" type="password" autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy("imp-pw", error)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Opening…" : "Import"}</Button>
      </div>
    </form>
  );
}

export function ImportPasswordDialog({ file, onSubmit, onClose }: { file: File | null; onSubmit: (password: string) => Promise<void>; onClose: () => void }) {
  return (
    <Dialog open={!!file} title="Password needed" onClose={onClose}>
      {file && <PasswordForm fileName={file.name} onSubmit={onSubmit} onClose={onClose} />}
    </Dialog>
  );
}
