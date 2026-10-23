"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Archive } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { packsNeedingBackup, snoozeUntil } from "@/lib/backupReminder";

/** Dashboard nudge: packs live only in this browser, so say so when a pack with files has no recent backup. */
export function BackupReminder() {
  const { packs, settings, saveSettings } = useApp();
  const { notify } = useToast();
  const due = useMemo(() => packsNeedingBackup(packs, settings), [packs, settings]);
  if (due.length === 0) return null;

  async function snooze() {
    try { await saveSettings({ ...settings, backupSnoozedUntil: snoozeUntil() }); notify("info", "Okay. Docutile will remind you again in 7 days."); }
    catch (e) { notify("error", e instanceof Error ? e.message : "The reminder could not be postponed."); }
  }

  return (
    <section role="region" aria-label="Backup reminder" className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
      <h2 className="flex items-center gap-2 font-semibold"><Archive className="h-4 w-4" aria-hidden /> Back up your packs</h2>
      <p className="mt-1">
        Your packs are stored only in this browser. If browser data is cleared or you switch device, they are gone.{" "}
        {due.length === 1 ? "This pack has" : `${due.length} packs have`} no recent backup:
      </p>
      <ul className="mt-1 list-disc pl-5">
        {due.slice(0, 5).map((p) => (
          <li key={p.id}><Link href={`/packs/${p.id}`} className="underline hover:text-white">{p.name}</Link></li>
        ))}
        {due.length > 5 && <li>and {due.length - 5} more</li>}
      </ul>
      <p className="mt-1 text-xs text-amber-200">Open a pack and choose Export backup. You can protect the file with a password.</p>
      <Button size="sm" className="mt-2" onClick={snooze}>Remind me in 7 days</Button>
    </section>
  );
}
