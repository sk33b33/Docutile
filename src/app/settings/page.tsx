"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, TextInput } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_ACCEPTED_TYPES, MB } from "@/lib/constants";
import { formatTypeList } from "@/lib/format";

export default function SettingsPage() {
  const { settings, saveSettings, clearAllData, log } = useApp();
  const { notify } = useToast();
  const [mb, setMb] = useState(String(settings.defaultMaxFileSizeBytes / MB));
  const [error, setError] = useState<string>();
  const [confirmClear, setConfirmClear] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(mb);
    if (!Number.isFinite(n) || n <= 0 || n > 500) { setError("Enter a size between 0.1 and 500 MB."); return; }
    setError(undefined);
    try { await saveSettings({ defaultMaxFileSizeBytes: Math.round(n * MB) }); notify("success", "Default file size limit saved. It applies to new slots."); }
    catch (err) { notify("error", err instanceof Error ? err.message : "Settings could not be saved."); }
  }

  async function clear() {
    setConfirmClear(false);
    try { await clearAllData(); notify("success", "All local Docutile data was deleted from this browser."); }
    catch (err) { notify("error", err instanceof Error ? err.message : "Data could not be cleared."); return; }
    await log("data_cleared", "Cleared all local data");
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-6">
        <section className="rounded-lg border border-white/10 glass p-5">
          <h2 className="text-base font-semibold">File limits</h2>
          <form onSubmit={save} className="mt-3 space-y-3" noValidate>
            <Field label="Default maximum file size (MB)" htmlFor="max-size" error={error} hint="Applies to slots created from now on. Existing slots keep their own limit; edit a slot to change it.">
              <TextInput id="max-size" inputMode="decimal" value={mb} onChange={(e) => setMb(e.target.value)} className="max-w-32" aria-invalid={!!error} />
            </Field>
            <Button type="submit" variant="primary">Save</Button>
          </form>
          <p className="mt-4 text-sm text-slate-200">Default accepted file types: {formatTypeList(DEFAULT_ACCEPTED_TYPES)}. Only PDF, PNG and JPG files are merged into the exported PDF; other formats are listed on the cover sheet and supplied separately because converting them needs a server-side service that is not part of this local version.</p>
        </section>

        <section className="rounded-lg border border-white/10 glass p-5">
          <h2 className="text-base font-semibold">Local storage</h2>
          <p className="mt-2 text-sm text-slate-200">Drafts, files, templates and activity are stored in this browser using IndexedDB. They are not encrypted by Docutile, not backed up, and not shared with other people or devices. Clearing browser data, or using private browsing, can remove them. Use &ldquo;Export backup&rdquo; on a pack to save a copy as a file (not encrypted), and &ldquo;Import backup&rdquo; on the dashboard to restore it. Download anything else you need to keep.</p>
          <Button variant="danger" className="mt-4" onClick={() => setConfirmClear(true)}>Clear all local data…</Button>
        </section>
      </div>
      <ConfirmDialog open={confirmClear} danger title="Delete all local data?" confirmLabel="Delete everything"
        message="All packs, attached files, custom templates, activity history and settings will be permanently removed from this browser. This cannot be undone."
        onCancel={() => setConfirmClear(false)} onConfirm={clear} />
    </>
  );
}
