"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState, PageHeader } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";

export default function ActivityPage() {
  const { activity, packs, clearActivity } = useApp();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState(false);
  const name = (id: string | null) => (id ? packs.find((p) => p.id === id)?.name : undefined);

  async function clear() {
    setConfirming(false);
    try {
      await clearActivity();
      notify("success", "Activity history cleared. Your packs and files were not touched.");
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "The activity history could not be cleared.");
    }
  }

  return (
    <>
      <PageHeader
        title="Activity"
        description="Local activity history for this browser. It is informational only and is not an immutable or compliance-grade audit trail."
        actions={
          <Button onClick={() => setConfirming(true)} disabled={activity.length === 0} aria-describedby="clear-activity-help">
            <Trash2 className="h-4 w-4" aria-hidden /> Clear activity
          </Button>
        }
      />
      <p id="clear-activity-help" className="mb-4 text-xs text-slate-300">
        {activity.length === 0
          ? "Nothing to clear: there is no activity yet."
          : "Clearing removes this history only. Your packs, files and templates are not affected."}
      </p>
      {activity.length === 0 ? (
        <EmptyState title="No activity yet">Events such as creating packs and attaching files will appear here.</EmptyState>
      ) : (
        <ul className="divide-y divide-white/10 rounded-xl glass">
          {activity.slice(0, 500).map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 break-words">{e.message}{name(e.packId) && <span className="text-slate-400"> · {name(e.packId)}</span>}</span>
              <time dateTime={e.timestamp} className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(e.timestamp)}</time>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirming}
        danger
        title="Clear activity history?"
        confirmLabel="Clear activity"
        message={<>This removes all {activity.length} entries from the activity list in this browser. It cannot be undone. Your packs, files and templates are not affected.</>}
        onConfirm={clear}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
